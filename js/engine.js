// Core simulation: world setup, yearly simulation, wars, elections, succession.
var G = window.G || (window.G = {});

G.engine = (function () {
  var U = G.util, D = G.data;
  var SPACE_K = 22;
  var SAVE_VERSION = 1;

  // ---------- helpers ----------
  function S() { return G.state; }
  function nation(id) { return S().nations[id]; }
  function alive() {
    var out = [], ns = S().nations;
    for (var k in ns) if (ns[k].alive) out.push(ns[k]);
    return out;
  }
  function pn() { return nation(S().player.nation); }
  function isLeader() { return S().player.role === 'leader'; }
  function gov(n) { return D.govs[n.gov]; }
  function title(n) {
    // Nation-specific titles only apply to the government type they started with.
    return n.title && n.gov === n.origGov ? n.title : gov(n).title;
  }
  function log(text, type) {
    var s = S();
    s.log.unshift({ year: s.year, text: text, type: type || 'world' });
    if (s.log.length > 400) s.log.length = 400;
    if (s.turnNews) s.turnNews.push({ text: text, type: type || 'world' });
  }

  function yearsPerTurn(year) {
    if (year < 2150) return 1;
    if (year < 2400) return 5;
    if (year < 2700) return 10;
    return 25;
  }
  function era(year) {
    if (year < 2150) return 'Reconstruction Era';
    if (year < 2400) return 'Expansion Era';
    if (year < 2700) return 'Interplanetary Era';
    return 'Stellar Era';
  }

  function allocShares(n) {
    var a = n.alloc, t = a.mil + a.econ + a.welfare + a.sci + a.space || 1;
    return { mil: a.mil / t, econ: a.econ / t, welfare: a.welfare / t, sci: a.sci / t, space: a.space / t };
  }
  var SECTORS = ['mil', 'econ', 'welfare', 'sci', 'space'];
  function revenue(n) { return n.gdp * n.tax; }
  // Spending per sector is stored as a fraction of GDP (n.spend).
  // AI governments derive it from their budget weights, spending 80% of revenue.
  function syncSpend(n) {
    var sh = allocShares(n), total = n.tax * 0.8;
    n.spend = {};
    SECTORS.forEach(function (k) { n.spend[k] = total * sh[k]; });
  }
  function funds(n) {
    if (!n.spend) syncSpend(n);
    var out = {};
    SECTORS.forEach(function (k) { out[k] = n.spend[k] * n.gdp; });
    return out;
  }
  function spending(n) { var f = funds(n); return SECTORS.reduce(function (a, k) { return a + f[k]; }, 0); }
  function debt(n) { return Math.max(0, -n.treasury); }
  function debtRatio(n) { return debt(n) / n.gdp; }
  // Interest rises as debt grows: lenders get nervous above 60% of GDP.
  function interestRate(n) { return Math.min(0.15, 0.03 + Math.max(0, debtRatio(n) - 0.6) * 0.06); }
  function interest(n) { return debt(n) * interestRate(n); }
  function projectCost(n) { return n.mil ? G.military.projectCost(n) : 0; }
  // Yearly balance: positive = surplus, negative = deficit.
  function balance(n) { return revenue(n) - spending(n) - interest(n) - projectCost(n); }
  // How far a government can borrow for actions.
  function borrowLimit(n) { return n.gdp * 1.2; }
  function power(n, defending) { return G.military.power(n, defending); }
  function milestoneIndex(n) {
    var ms = D.milestones, i = 0;
    while (i + 1 < ms.length && n.space >= ms[i + 1].points) i++;
    return i;
  }
  function earthFactor() { return 0.6 + S().earth / 250; }
  function ceilingPc(n) {
    // GDP per capita ceiling in thousands of dollars.
    return n.tech * 1.3 * D.milestones[milestoneIndex(n)].ceil * earthFactor();
  }
  // Space points per year: share of GDP spent on space, scaled sub-linearly by economy size and by tech.
  function spaceRate(n) {
    var f = funds(n);
    return (f.space / n.gdp) * Math.pow(n.gdp, 0.3) * Math.pow(n.tech / 80, 0.8) * SPACE_K;
  }
  function worldPop() { return alive().reduce(function (a, n) { return a + n.pop; }, 0); }
  function modSum(n, type) {
    var y = S().year, v = 0;
    n.mods = n.mods.filter(function (m) { return m.until >= y; });
    n.mods.forEach(function (m) { if (m.type === type) v += m.value; });
    return v;
  }
  function addMod(n, type, value, years) { n.mods.push({ type: type, value: value, until: S().year + years }); }

  function relation(a, b) { return a.rel[b.id] || 0; }
  function changeRel(a, b, d) {
    a.rel[b.id] = U.clamp((a.rel[b.id] || 0) + d, -100, 100);
    b.rel[a.id] = U.clamp((b.rel[a.id] || 0) + d, -100, 100);
  }

  function wars() { return S().wars; }
  function warsOf(n) { return S().wars.filter(function (w) { return w.a === n.id || w.b === n.id; }); }
  function atWar(n) { return warsOf(n).length > 0; }
  function warBetween(a, b) {
    return S().wars.filter(function (w) { return (w.a === a.id && w.b === b.id) || (w.a === b.id && w.b === a.id); })[0];
  }
  function enemiesOf(n) {
    return warsOf(n).map(function (w) { return nation(w.a === n.id ? w.b : w.a); });
  }
  function hasPact(a, b, type) {
    return S().pacts.some(function (p) {
      return p.type === type && ((p.a === a.id && p.b === b.id) || (p.a === b.id && p.b === a.id)) && p.until >= S().year;
    });
  }
  function canReach(a, b) {
    if (a.id === b.id || !b.alive) return false;
    if (a.neighbors.indexOf(b.id) >= 0) return true;
    // Global reach: a strong navy/air/space force, reach projects or an advanced space programme.
    var M = G.military;
    var maxProj = Math.max.apply(null, alive().map(M.projection));
    return M.hasReach(a) || M.projection(a) >= maxProj * 0.35 || milestoneIndex(a) >= 4;
  }
  function worldMaxPower() { return Math.max.apply(null, alive().map(power)); }
  function rank(n, fn) {
    var arr = alive().slice().sort(function (x, y) { return fn(y) - fn(x); });
    return arr.indexOf(n) + 1;
  }

  // ---------- new game ----------
  function makeLeader(n) {
    var g = G.names.randomGender();
    return { name: G.names.full(n.culture, g), gender: g, age: U.randInt(45, 68), since: S().year };
  }

  function newGame(opts) {
    G.state = {
      version: SAVE_VERSION,
      rng: (Math.random() * 4294967296) >>> 0,
      year: 2077, turn: 1, earth: 42,
      nations: {}, wars: [], pacts: [], log: [], firsts: {}, achievements: [],
      ap: 2, used: [], turnNews: [], event: null, summary: null, succession: null, over: false
    };
    var s = G.state;
    D.nations.forEach(function (d) {
      var n = JSON.parse(JSON.stringify(d));
      n.origGov = n.gov;
      n.alive = true;
      n.treasury = n.gdp * 0.05;
      n.mods = [];
      n.rel = {};
      n.warYears = 0;
      n.lastElection = 2077 - U.randInt(0, 3);
      s.nations[n.id] = n;
      G.military.init(n, funds(n).mil, n.armyMult);
      n.leader = makeLeader(n);
    });
    // Initial relations: rivals are hostile, neighbours wary.
    var ids = Object.keys(s.nations);
    ids.forEach(function (a) {
      ids.forEach(function (b) {
        if (a < b) {
          var r = U.randInt(-15, 25);
          if (s.nations[a].neighbors.indexOf(b) >= 0) r -= 15;
          s.nations[a].rel[b] = r; s.nations[b].rel[a] = r;
        }
      });
    });
    [['USA', 'CHN', -55], ['USA', 'RUS', -60], ['EF', 'RUS', -65], ['CHN', 'IND', -40], ['RUS', 'SIB', -70],
     ['USA', 'CAS', -35], ['USA', 'EF', 35], ['PAC', 'CHN', -35], ['EF', 'SWE', 10], ['SWE', 'CAS', 40],
     ['TUR', 'RUS', -30], ['GULF', 'IND', 20], ['SAC', 'MESO', 25], ['AUS', 'SGP', 40]].forEach(function (r) {
      s.nations[r[0]].rel[r[1]] = r[2]; s.nations[r[1]].rel[r[0]] = r[2];
    });

    s.firsts[1] = { nation: 'USA', year: 2061 };
    s.firsts[2] = { nation: 'USA', year: 2065 };

    var n = s.nations[opts.nation];
    var p = {
      name: opts.name, gender: opts.gender, nation: n.id, role: opts.role, origRole: opts.role,
      age: opts.age || 42, influence: 20, popularity: 25, wealth: 5, generation: 1,
      dynasty: opts.name.split(' ').slice(-1)[0], candidate: false, heirBonus: 0, since: 2077, legacy: 0
    };
    if (opts.role === 'leader') { p.influence = 50; p.popularity = n.approval; n.leader = null; p.wealth = 20; }
    if (opts.role === 'politician') { p.influence = 25; p.popularity = 30; p.wealth = 8; }
    if (opts.role === 'general') { p.influence = 30; p.popularity = 20; p.wealth = 6; }
    if (opts.role === 'corporate') { p.influence = 20; p.popularity = 15; p.wealth = 250; p.company = G.names.company(); }
    s.player = p;
    if (p.role === 'leader') n.lastElection = 2077;

    log('The Treaty of Reykjavík ends the Long War. One in three humans is gone. The rebuilding begins.', 'major');
    log(p.name + ' begins their story as ' + roleTitle() + ' of ' + n.name + '.', 'player');
    return s;
  }

  function roleTitle() {
    var p = S().player, n = pn();
    if (p.role === 'leader') return title(n);
    if (p.role === 'corporate') return 'CEO of ' + (p.company || 'a megacorp');
    return D.roles[p.role].name;
  }

  // ---------- yearly simulation ----------
  function simulateNation(n, isPlayerNation) {
    var f = funds(n), g = gov(n);
    var war = atWar(n);
    var pc = n.gdp / n.pop; // thousands per person
    var ceil = ceilingPc(n);
    var econR = f.econ / n.gdp, welR = f.welfare / n.gdp, sciR = f.sci / n.gdp, milR = f.mil / n.gdp;

    // Economy: logistic catch-up towards the tech ceiling + investment.
    var growth = 0.05 * (1 - pc / ceil) + econR * 0.5 + modSum(n, 'growth');
    if (war) growth -= 0.025;
    // Conscripts are taken out of the workforce.
    growth -= G.military.conscGrowthPenalty(n);
    // Heavy debt crowds out investment.
    growth -= Math.max(0, debtRatio(n) - 0.9) * 0.02;
    if (n.stability < 30) growth -= (30 - n.stability) * 0.001;
    growth = U.clamp(growth, -0.15, 0.12);
    n.growth = growth;
    n.gdp = Math.max(5, n.gdp * (1 + growth));

    // Population with a soft global carrying capacity raised by space colonies.
    var cap = 9000 * earthFactor() + alive().reduce(function (a, x) { return a + Math.max(0, milestoneIndex(x) - 3) * 400; }, 0);
    var popG = (0.004 + welR * 0.12 + modSum(n, 'pop')) * Math.max(-0.5, 1 - worldPop() / cap);
    if (war) popG -= 0.004;
    n.pop = Math.max(0.5, n.pop * (1 + popG));

    // Technology: research + diffusion from the leader.
    var maxTech = Math.max.apply(null, alive().map(function (x) { return x.tech; }));
    // Diminishing returns: each new tech level is harder to reach.
    var techDamp = 100 / (100 + Math.max(0, n.tech - 80) * 0.6);
    n.tech += sciR * 35 * g.sci * techDamp + (maxTech - n.tech) * 0.01 + modSum(n, 'tech');

    // Space programme.
    var before = milestoneIndex(n);
    n.space += spaceRate(n) * (1 + modSum(n, 'space'));
    checkMilestones(n, before);

    // Military: manpower, equipment and projects.
    G.military.simulate(n, f.mil, !(isPlayerNation && isLeader()));

    // Treasury: surplus is saved, deficits become national debt.
    n.treasury += balance(n);
    var dr = debtRatio(n);

    // Approval and stability.
    var apT = 50 + (growth - 0.02) * 400 + welR * 250 - n.warYears * 2 - (n.tax - 0.2) * 120 + modSum(n, 'approval') - G.military.conscApprovalPenalty(n);
    if (n.gov === 'junta') apT += milR * 150;
    apT = U.clamp(apT, 5, 95);
    n.approval = U.clamp(n.approval + (apT - n.approval) * 0.25, 0, 100);
    // Empires are hard to hold: each conquered nation weighs on stability.
    var held = 0, all = S().nations;
    for (var hid in all) if (!all[hid].alive && all[hid].annexedBy === n.id) held++;
    var stT = 28 + n.approval * 0.5 + g.stab - held * 4 - Math.max(0, dr - 0.9) * 15 - (war ? 6 : 0) + modSum(n, 'stability') + (n.gov === 'junta' ? milR * 200 : 0);
    stT = U.clamp(stT, 5, 98);
    n.stability = U.clamp(n.stability + (stT - n.stability) * 0.2, 0, 100);
    if (war) n.warYears++; else n.warYears = Math.max(0, n.warYears - 2);

    // Relations drift back towards neutral, while border frictions create new rivalries.
    for (var k in n.rel) n.rel[k] *= 0.985;
    var nb = n.neighbors.filter(function (id) { return S().nations[id].alive; });
    if (nb.length) changeRel(n, S().nations[U.pick(nb)], U.randInt(-6, 5));

    if (!isPlayerNation || !isLeader()) {
      aiBudget(n);
      // AI governments reinvest surplus reserves instead of hoarding them.
      var capT = n.gdp * 0.15;
      if (n.treasury > capT) { addMod(n, 'growth', Math.min(0.01, (n.treasury - capT) / n.gdp * 0.1), 1); n.treasury = capT; }
    }
  }

  function checkMilestones(n, before) {
    var after = milestoneIndex(n), s = S();
    for (var i = before + 1; i <= after; i++) {
      var m = D.milestones[i];
      var first = !s.firsts[i];
      if (first) s.firsts[i] = { nation: n.id, year: s.year };
      n.tech += 1;
      if (first) {
        addMod(n, 'approval', 10, 3);
        log('🚀 ' + n.name + ' achieves ' + m.name + ', the first nation in history to do so!', n.id === s.player.nation ? 'player' : 'major');
      } else {
        addMod(n, 'approval', 3, 2);
        log('🚀 ' + n.name + ' achieves ' + m.name + '.', n.id === s.player.nation ? 'player' : 'world');
      }
      if (n.id === s.player.nation) s.player.legacy += first ? 15 : 5;
    }
  }

  // AI budget: shifts towards war footing when at war, recovers otherwise.
  function aiBudget(n) {
    var a = n.alloc;
    var base = D.nations.filter(function (d) { return d.id === n.id; })[0];
    var target = base ? base.alloc : { mil: 25, econ: 30, welfare: 20, sci: 13, space: 12 };
    if (atWar(n)) target = { mil: target.mil * 1.8, econ: target.econ, welfare: target.welfare * 0.7, sci: target.sci, space: target.space * 0.5 };
    // As the centuries pass, AI nations invest more in space.
    var spaceTilt = Math.min(2, 1 + (S().year - 2077) / 300);
    target = Object.assign({}, target, { space: target.space * spaceTilt });
    SECTORS.forEach(function (k) { a[k] += (target[k] - a[k]) * 0.3; });
    if (n.approval < 30) n.tax = Math.max(0.12, n.tax - 0.005);
    if (n.treasury < 0) n.tax = Math.min(0.35, n.tax + 0.01);
    syncSpend(n);
  }

  // ---------- wars ----------
  function declareWar(a, b, quiet) {
    if (warBetween(a, b)) return;
    S().wars.push({ a: a.id, b: b.id, start: S().year, score: 0, aStart: power(a), bStart: power(b, true), v2: true });
    S().pacts = S().pacts.filter(function (p) { return !((p.a === a.id && p.b === b.id) || (p.a === b.id && p.b === a.id)); });
    changeRel(a, b, -60);
    var involvesPlayer = a.id === S().player.nation || b.id === S().player.nation;
    if (!quiet) log('⚔️ ' + a.name + ' declares war on ' + b.name + '!', involvesPlayer ? 'player' : 'major');
    // Nations that like the defender sour on the aggressor.
    alive().forEach(function (o) {
      if (o !== a && o !== b && relation(o, b) > 30) changeRel(o, a, -10);
    });
  }

  function endWar(w, text) {
    S().wars = S().wars.filter(function (x) { return x !== w; });
    var a = nation(w.a), b = nation(w.b);
    if (a.alive && b.alive) addPact(a, b, 'nap', 10);
    if (text) log(text, (w.a === S().player.nation || w.b === S().player.nation) ? 'player' : 'major');
  }

  function addPact(a, b, type, years) {
    S().pacts.push({ a: a.id, b: b.id, type: type, until: S().year + years });
  }

  function simulateWar(w) {
    var a = nation(w.a), b = nation(w.b);
    if (!a.alive || !b.alive) { endWar(w); return; }
    // b is the defender (missile shields help).
    var pa = power(a), pb = power(b, true), tot = pa + pb || 1;
    G.military.losses(a, U.clamp(0.12 * pb / tot, 0.01, 0.25));
    G.military.losses(b, U.clamp(0.12 * pa / tot, 0.01, 0.25));
    w.score = U.clamp(w.score + ((pa - pb) / tot) * 35 + U.randInt(-6, 6), -100, 100);
    a.pop *= 0.999; b.pop *= 0.999;
    var superWar = a.gdp > 8000 && b.gdp > 8000;
    S().earth = U.clamp(S().earth - (superWar ? 0.8 : 0.2), 0, 100);

    if (w.score >= 100 || power(b, true) < w.bStart * 0.1) return capitulate(w, a, b);
    if (w.score <= -100 || power(a) < w.aStart * 0.1) return capitulate(w, b, a);

    // AI peace: involving the player only through player actions/events.
    var p = S().player.nation;
    if (w.a !== p && w.b !== p) {
      var years = S().year - w.start;
      if ((Math.abs(w.score) > 40 && U.chance(0.15)) || (years > 6 && U.chance(0.12))) {
        var winner = w.score >= 0 ? a : b, loser = w.score >= 0 ? b : a;
        cede(winner, loser, Math.abs(w.score) / 100 * 0.12);
        endWar(w, '🕊️ ' + loser.name + ' sues for peace with ' + winner.name + ' and cedes territory.');
      }
    }
  }

  function cede(winner, loser, frac) {
    frac = U.clamp(frac, 0.02, 0.3);
    var dp = loser.pop * frac, dg = loser.gdp * frac;
    loser.pop -= dp; loser.gdp -= dg;
    winner.pop += dp * 0.9; winner.gdp += dg * 0.8;
    var rep = loser.treasury > 0 ? loser.treasury * 0.3 : 0;
    loser.treasury -= rep; winner.treasury += rep;
    addMod(winner, 'approval', 8, 3);
    addMod(loser, 'approval', -10, 3);
    addMod(loser, 'stability', -8, 3);
  }

  function capitulate(w, winner, loser) {
    var full = loser.gdp < winner.gdp * 0.2;
    if (full) {
      annex(winner, loser);
      endWar(w, '🏳️ ' + loser.name + ' has fallen. It is annexed by ' + winner.name + '.');
    } else {
      cede(winner, loser, 0.25);
      endWar(w, '🏳️ ' + loser.name + ' capitulates to ' + winner.name + ', ceding a quarter of its territory.');
    }
  }

  function annex(winner, loser) {
    winner.pop += loser.pop * 0.9;
    winner.gdp += loser.gdp * 0.8;
    G.military.transfer(loser, winner, 0.6);
    winner.treasury += Math.max(0, loser.treasury);
    winner.space += loser.space * 0.5;
    winner.tech = Math.max(winner.tech, (winner.tech * 3 + loser.tech) / 4);
    loser.neighbors.forEach(function (id) {
      if (id !== winner.id && winner.neighbors.indexOf(id) < 0) {
        winner.neighbors.push(id);
        if (nation(id).neighbors.indexOf(winner.id) < 0) nation(id).neighbors.push(winner.id);
      }
    });
    loser.alive = false;
    loser.annexedBy = winner.id;
    S().wars.filter(function (x) { return x.a === loser.id || x.b === loser.id; }).forEach(function (x) { endWar(x); });
    var p = S().player;
    if (p.nation === loser.id) {
      p.nation = winner.id;
      if (p.role === 'leader') {
        p.role = 'politician';
        p.influence = 10; p.popularity = 15;
        log('Your nation has been conquered. You escape into ' + winner.name + ', now a resistance figure with little power.', 'player');
      } else {
        p.influence = Math.round(p.influence * 0.4);
        log('Your homeland is absorbed into ' + winner.name + '. You must start over in a foreign land.', 'player');
      }
    }
    if (winner.id === p.nation) p.legacy += 10;
  }

  // Conquered nations can rise again when their occupier is unstable.
  function rebellions() {
    var ns = S().nations;
    Object.keys(ns).forEach(function (id) {
      var d = ns[id], owner = d.annexedBy && ns[d.annexedBy];
      if (d.alive || !owner || !owner.alive) return;
      if (owner.stability > 50 || !U.chance(0.02 + (50 - owner.stability) * 0.002)) return;
      var frac = U.clamp(d.pop / (owner.pop + d.pop), 0.05, 0.3);
      d.alive = true;
      d.pop = owner.pop * frac; d.gdp = owner.gdp * frac;
      owner.pop -= d.pop; owner.gdp -= d.gdp;
      d.tech = owner.tech * 0.95; d.space = owner.space * 0.1;
      d.treasury = d.gdp * 0.02; d.stability = 50; d.approval = 65; d.warYears = 0; d.mods = [];
      d.gov = U.pick(['democracy', 'democracy', 'junta', 'autocracy']);
      syncSpend(d);
      G.military.init(d, funds(d).mil, 0.6);
      G.military.scale(owner, 1 - frac * 0.5);
      d.leader = makeLeader(d);
      d.annexedBy = null;
      d.neighbors.forEach(function (nid) { if (ns[nid].neighbors.indexOf(d.id) < 0) ns[nid].neighbors.push(d.id); });
      if (d.neighbors.indexOf(owner.id) < 0) d.neighbors.push(owner.id);
      if (owner.neighbors.indexOf(d.id) < 0) owner.neighbors.push(d.id);
      changeRel(d, owner, -50);
      addPact(d, owner, 'nap', 5);
      var pid = S().player.nation;
      log('🔥 ' + d.name + ' rises from the ashes and declares independence from ' + owner.name + '!', owner.id === pid ? 'player' : 'major');
    });
  }

  function aiWarDecisions() {
    var ns = alive();
    ns.forEach(function (a) {
      if (a.id === S().player.nation && isLeader()) return;
      if (warsOf(a).length >= 2) return;
      // Chance scales with how many years pass this turn (we run yearly so it's per year).
      // War-weary nations (recent wars) rarely start new ones.
      if (a.warYears > 0 || !U.chance(0.03 * a.aggression)) return;
      var targets = ns.filter(function (b) {
        return b !== a && canReach(a, b) && !warBetween(a, b) && !hasPact(a, b, 'nap') &&
          relation(a, b) < -25 && power(a) > power(b) * 1.4;
      });
      if (!targets.length) return;
      var b = U.pick(targets);
      // Peace-loving years after the Long War: early wars are rarer.
      if (S().year < 2085 && !U.chance(0.35)) return;
      declareWar(a, b);
    });
  }

  // ---------- AI leaders, elections, coups ----------
  function aiLeaders() {
    alive().forEach(function (n) {
      if (!n.leader) return;
      n.leader.age++;
      var died = U.chance(mortality(n.leader.age, n.tech));
      var couped = n.stability < 22 && U.chance(0.08);
      var elected = gov(n).elections && S().year - n.lastElection >= 4;
      if (n.id === S().player.nation && elected) return; // handled in player politics
      if (died) {
        log(n.leader.name + ', ' + title(n) + ' of ' + n.name + ', has died at age ' + n.leader.age + '.', 'world');
        n.leader = makeLeader(n);
      } else if (couped) {
        n.leader = makeLeader(n);
        if (n.gov === 'democracy' || n.gov === 'technocracy') n.gov = 'junta';
        n.stability = 45;
        log('💥 Coup in ' + n.name + '! ' + n.leader.name + ' seizes power.', n.id === S().player.nation ? 'player' : 'major');
      } else if (elected) {
        n.lastElection = S().year;
        if (n.approval < 45 || U.chance(0.25)) {
          n.leader = makeLeader(n);
          log('🗳️ ' + n.name + ' elects a new ' + title(n) + ': ' + n.leader.name + '.', 'world');
        }
      }
    });
  }

  function mortality(age, tech) {
    // Medicine improves with technology, pushing the curve later.
    var shift = Math.max(0, (tech - 85) * 0.25);
    return Math.min(0.6, 0.0004 * Math.exp(0.09 * (age - 30 - shift)));
  }

  function playerPolitics() {
    var s = S(), p = s.player, n = pn(), g = gov(n);
    // Elections in the player's nation.
    if (g.elections && s.year - n.lastElection >= 4) {
      n.lastElection = s.year;
      if (p.role === 'leader') {
        var score = (n.approval - 50) * 0.09 + (p.popularity - 40) * 0.03 + (p.influence - 40) * 0.015;
        if (U.chance(U.sigmoid(score + 0.3))) {
          log('🗳️ You win re-election as ' + title(n) + ' of ' + n.name + '!', 'player');
          p.popularity = Math.min(100, p.popularity + 5);
          p.legacy += 3;
        } else {
          log('🗳️ You lose the election. The voters of ' + n.name + ' have turned their backs on you.', 'player');
          p.role = 'politician';
          p.candidate = false;
          n.leader = makeLeader(n);
          var base = D.nations.filter(function (d) { return d.id === n.id; })[0];
          if (base) n.alloc = JSON.parse(JSON.stringify(base.alloc));
          syncSpend(n);
          s.succession = { reason: 'election', text: 'You lost the election. You can fight on as leader of the opposition, or hand your legacy to an heir.' };
        }
      } else if (p.candidate) {
        var sc = (p.popularity - (n.leader ? n.approval : 50)) * 0.07 + (p.influence - 35) * 0.04;
        p.candidate = false;
        if (U.chance(U.sigmoid(sc))) {
          becomeLeader('🗳️ You win the election! ' + p.name + ' is the new ' + title(n) + ' of ' + n.name + '.');
        } else {
          log('🗳️ You lose the election to ' + (n.leader ? n.leader.name : 'the incumbent') + '. Build more support and try again.', 'player');
          p.popularity = Math.max(0, p.popularity - 5);
        }
      } else {
        if (n.leader && (n.approval < 45 || U.chance(0.25))) {
          n.leader = makeLeader(n);
          log('🗳️ ' + n.name + ' elects a new ' + title(n) + ': ' + n.leader.name + '.', 'world');
        } else {
          log('🗳️ ' + n.name + ' holds elections. The incumbent stays in power.', 'world');
        }
      }
    }
    // Coup risk for the player as leader.
    if (p.role === 'leader' && n.stability < 25) {
      var risk = (25 - n.stability) * 0.006 * (1 - p.influence / 200);
      if (U.chance(risk)) {
        log('💥 Coup! Your own generals storm the palace. Your rule is over.', 'player');
        n.leader = makeLeader(n);
        if (n.gov !== 'junta' && U.chance(0.6)) n.gov = 'junta';
        n.stability = 45;
        var survive = U.chance(0.4);
        if (survive) {
          p.role = 'politician'; p.influence = Math.round(p.influence * 0.3); p.popularity = Math.round(p.popularity * 0.6);
          s.succession = { reason: 'coup-survived', text: 'You escaped the coup alive, but you lost everything. Plot your return, or pass the torch to an heir.' };
        } else {
          killPlayer('was executed by the coup plotters');
        }
      }
    }
  }

  function becomeLeader(text) {
    var p = S().player, n = pn();
    p.role = 'leader';
    p.since = S().year;
    n.leader = null;
    if (gov(n).elections) n.lastElection = S().year;
    p.legacy += 10;
    log(text, 'player');
  }

  function playerAging() {
    var p = S().player;
    p.age++;
    if (p.role === 'corporate') p.wealth *= 1 + U.clamp(pn().growth || 0.02, -0.1, 0.1) + 0.03;
    if (U.chance(mortality(p.age, pn().tech))) killPlayer('died at age ' + p.age);
    p.influence = U.clamp(p.influence - 0.5, 0, 100);
    if (p.role === 'leader') p.popularity += (pn().approval - p.popularity) * 0.3;
  }

  function killPlayer(how) {
    var s = S(), p = s.player;
    if (s.succession && s.succession.dead) return;
    log('⚰️ ' + p.name + ' ' + how + '.', 'player');
    s.succession = { reason: 'death', dead: true, wasLeader: p.role === 'leader', text: p.name + ' ' + how + '. Their story is over, but the ' + p.dynasty + ' legacy lives on.' };
  }

  // Successor options when the player dies or loses power.
  function successorOptions() {
    var s = S(), p = s.player, n = pn();
    var opts = [];
    var g1 = G.names.randomGender(), g2 = G.names.randomGender();
    var dynastic = ['monarchy', 'autocracy', 'oneparty', 'corporate'].indexOf(n.gov) >= 0;
    opts.push({
      kind: 'heir', name: G.names.first(n.culture, g1) + ' ' + p.dynasty, gender: g1, age: U.randInt(24, 40),
      role: s.succession.wasLeader && dynastic && n.stability > 30 ? 'leader' : (p.origRole === 'leader' ? 'politician' : p.origRole),
      desc: 'Your heir. Inherits the family name, ' + (p.role === 'corporate' ? 'most of the fortune' : 'part of your network') + ' and your enemies.'
    });
    var protegeRole = s.succession.wasLeader && !dynastic ? 'leader' : (p.role === 'leader' ? 'politician' : p.role);
    opts.push({
      kind: 'protege', name: G.names.full(n.culture, g2), gender: g2, age: U.randInt(35, 55), role: protegeRole,
      desc: s.succession.wasLeader && !dynastic ? 'Your deputy, constitutionally next in line. Takes over your office.' : 'Your loyal protégé. Experienced, but carries less of your name.'
    });
    return opts;
  }

  function applySuccessor(o) {
    var s = S(), p = s.player, n = pn();
    var inheritInf = o.kind === 'heir' ? 0.5 : 0.65;
    var newP = {
      name: o.name, gender: o.gender, nation: p.nation, role: o.role, origRole: o.role === 'leader' ? p.origRole : o.role,
      age: o.age, influence: Math.round(Math.max(15, p.influence * inheritInf + p.heirBonus)),
      popularity: Math.round(Math.max(15, p.popularity * 0.6)),
      wealth: o.kind === 'heir' ? p.wealth * 0.8 : p.wealth * 0.2 + 5,
      generation: p.generation + 1, dynasty: o.kind === 'heir' ? p.dynasty : o.name.split(' ').slice(-1)[0],
      candidate: false, heirBonus: 0, since: s.year, legacy: p.legacy, company: p.company
    };
    s.player = newP;
    if (o.role === 'leader') { n.leader = null; newP.since = s.year; }
    else if (!n.leader) n.leader = makeLeader(n);
    log('A new chapter: ' + newP.name + ' takes up the legacy as ' + roleTitle() + '.', 'player');
    s.succession = null;
  }

  function continueAfterLoss() {
    S().succession = null;
  }

  // ---------- turn ----------
  function endTurn() {
    var s = S();
    s.turnNews = [];
    var snap = snapshot();
    var years = yearsPerTurn(s.year);
    for (var y = 0; y < years; y++) {
      s.year++;
      alive().forEach(function (n) { simulateNation(n, n.id === s.player.nation); });
      s.wars.slice().forEach(simulateWar);
      aiWarDecisions();
      rebellions();
      aiLeaders();
      playerPolitics();
      if (!s.succession || !s.succession.dead) playerAging();
      s.earth = U.clamp(s.earth + 0.15 + (s.wars.length === 0 ? 0.1 : 0), 0, 100);
      s.pacts = s.pacts.filter(function (p) { return p.until >= s.year; });
      if (s.succession) break; // stop to let the player resolve succession
    }
    s.turn++;
    s.ap = 2;
    s.used = [];
    checkAchievements();
    s.summary = { years: years, from: snap, news: s.turnNews.slice() };
    s.turnNews = null;
    // Roll an event for the new turn (if no succession pending).
    if (!s.succession) s.event = G.events.roll();
    save();
  }

  function snapshot() {
    var n = pn(), p = S().player;
    return { year: S().year, treasury: n.treasury, gdp: n.gdp, pop: n.pop, army: power(n), approval: n.approval, stability: n.stability,
      tech: n.tech, space: n.space, influence: p.influence, popularity: p.popularity, wealth: p.wealth, nation: n.id };
  }

  function checkAchievements() {
    var s = S(), n = pn();
    function award(id, text) {
      if (s.achievements.indexOf(id) >= 0) return;
      s.achievements.push(id);
      s.player.legacy += 20;
      log('🏆 Achievement: ' + text, 'player');
    }
    if (rank(n, function (x) { return x.gdp; }) === 1) award('gdp1', n.name + ' is the largest economy in the world.');
    if (rank(n, power) === 1) award('mil1', n.name + ' commands the strongest military on Earth.');
    if (rank(n, function (x) { return x.space; }) === 1) award('space1', n.name + ' leads the space race.');
    if (rank(n, function (x) { return x.tech; }) === 1) award('tech1', n.name + ' is the most advanced civilisation.');
    if (s.achievements.indexOf('gdp1') >= 0 && s.achievements.indexOf('mil1') >= 0 && s.achievements.indexOf('space1') >= 0 && s.achievements.indexOf('tech1') >= 0)
      award('world', n.name + ' leads the world in EVERYTHING.');
    if (alive().length === 1) award('unify', 'The world is united under ' + n.name + '.');
    if (milestoneIndex(n) >= D.milestones.length - 1) award('god', 'Space God. ' + n.name + ' has reached Kardashev II.');
    if (s.earth >= 90) award('earth', 'Earth is healed.');
    if (s.year >= 3000) award('y3000', 'Your legacy reached the year 3000.');
  }

  // ---------- persistence ----------
  var KEY = 'ashes-to-stars-save';
  function save() { try { localStorage.setItem(KEY, JSON.stringify(G.state)); } catch (e) { /* ignore */ } }
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return false;
      var st = JSON.parse(raw);
      if (st.version !== SAVE_VERSION) return false;
      G.state = st;
      // Older saves: derive per-sector spending from budget weights.
      for (var id in st.nations) {
        var sn = st.nations[id];
        if (!sn.spend) syncSpend(sn);
        if (!sn.mil) { G.military.init(sn, funds(sn).mil, 0.8); delete sn.army; }
      }
      // Older saves: war strength baselines were measured in a different unit.
      st.wars.forEach(function (w) { if (!w.v2) { w.aStart = power(st.nations[w.a]); w.bStart = power(st.nations[w.b], true); w.v2 = true; } });
      return true;
    } catch (e) { return false; }
  }
  function hasSave() { try { return !!localStorage.getItem(KEY); } catch (e) { return false; } }
  function wipe() { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } }

  return {
    newGame: newGame, endTurn: endTurn, save: save, load: load, hasSave: hasSave, wipe: wipe,
    nation: nation, alive: alive, pn: pn, isLeader: isLeader, gov: gov, title: title, roleTitle: roleTitle, log: log,
    yearsPerTurn: yearsPerTurn, era: era, allocShares: allocShares, revenue: revenue, funds: funds, power: power,
    SECTORS: SECTORS, syncSpend: syncSpend, spending: spending, debt: debt, debtRatio: debtRatio, interestRate: interestRate,
    interest: interest, balance: balance, borrowLimit: borrowLimit, projectCost: projectCost,
    milestoneIndex: milestoneIndex, spaceRate: spaceRate, relation: relation, changeRel: changeRel, wars: wars, warsOf: warsOf, atWar: atWar,
    warBetween: warBetween, enemiesOf: enemiesOf, hasPact: hasPact, addPact: addPact, canReach: canReach, rank: rank,
    declareWar: declareWar, endWar: endWar, cede: cede, capitulate: capitulate, addMod: addMod, becomeLeader: becomeLeader,
    killPlayer: killPlayer, successorOptions: successorOptions, applySuccessor: applySuccessor,
    continueAfterLoss: continueAfterLoss, mortality: mortality, makeLeader: makeLeader, worldPop: worldPop
  };
})();
