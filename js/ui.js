// User interface: screens, tabs and modals.
var G = window.G || (window.G = {});

G.ui = (function () {
  var U = G.util, E = G.engine, D = G.data, A = G.actions, EV = G.events;
  var app, tab = 'home', create = null;

  function $(id) { return document.getElementById(id); }
  function S() { return G.state; }
  function esc(s) { return U.esc(s); }

  // ---------- generic helpers ----------
  function modal(html) {
    $('modal-box').innerHTML = html;
    $('modal').classList.remove('hidden');
    $('modal-box').scrollTop = 0;
  }
  function closeModal() { $('modal').classList.add('hidden'); $('modal-box').innerHTML = ''; }
  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add('hidden'); }, 2600);
  }
  function bar(v, cls) {
    v = U.clamp(v, 0, 100);
    if (!cls) cls = v >= 60 ? 'good' : v >= 35 ? 'warn' : 'bad';
    return '<div class="bar ' + cls + '"><i style="width:' + v.toFixed(0) + '%"></i></div>';
  }
  function stat(k, v) { return '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'; }
  function rankStr(r) { return '#' + r; }
  function wealthStr(m) { return U.money(m / 1000); }

  // Event delegation: elements with data-act="name" and optional data-arg.
  var handlers = {};
  function on(name, fn) { handlers[name] = fn; }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var fn = handlers[el.getAttribute('data-act')];
    if (fn) { e.preventDefault(); fn(el.getAttribute('data-arg'), el); }
  });
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.getAttribute('data-input') && handlers[el.getAttribute('data-input')]) handlers[el.getAttribute('data-input')](el.value, el);
  });

  // ---------- title & creation ----------
  function titleScreen() {
    closeModal();
    var cont = E.hasSave() && E.load();
    app.innerHTML =
      '<div class="title-screen">' +
      '<div class="logo">ASHES<br>TO <span>STARS</span></div>' +
      '<div class="tagline">2077. The Long War is over. A third of humanity is gone.<br>Rebuild the world, or burn it again, and reach for the stars.</div>' +
      (cont ? '<button class="btn primary" data-act="continue">Continue: ' + esc(S().player.name) + ', ' + S().year + '</button>' : '') +
      '<button class="btn ' + (cont ? '' : 'primary') + '" data-act="newgame">New Game</button>' +
      '<button class="btn" data-act="howto">How to play</button>' +
      '<p class="muted small" style="margin-top:24px;text-align:center">Prototype v0.1</p>' +
      '</div>';
  }
  on('continue', function () { tab = 'home'; render(); window.scrollTo(0, 0); resumePending(); });
  on('newgame', function () {
    if (E.hasSave() && !confirm('Start a new game? Your current save will be overwritten.')) return;
    intro();
  });
  on('howto', function () {
    modal('<div class="kicker">How to play</div><h2>Ashes to Stars</h2>' +
      '<p>Every turn you get <b>2 actions</b>. Then press <b>End Turn</b> and the world moves forward: economies grow, wars rage, elections are held and rivals plot.</p>' +
      '<p>The <b>Military</b> tab shows your manpower, equipment and branches. As head of state you set conscription and start multi-year military projects there.</p>' +
      '<p><b>Heads of State</b> set taxes and spending, wage wars, sign treaties and run the space programme. Spend more than you earn and the deficit becomes <b>national debt</b>. Debt costs interest, and too much of it slows growth and destabilises the nation.</p>' +
      '<p><b>Politicians, Generals and Executives</b> spend their personal wealth to build influence and popularity, and must seize power through elections, coups or boardroom takeovers.</p>' +
      '<p>Your character ages and can die, lose elections or be overthrown. When that happens you continue as an <b>heir</b> or <b>protégé</b>. Your legacy lives on.</p>' +
      '<p>Turns are 1 year until 2150, then 5, 10 and finally 25 years. How far can you go? The year 3000? Kardashev II?</p>' +
      '<button class="btn primary" data-act="close">Got it</button>');
  });
  on('close', closeModal);

  function intro() {
    app.innerHTML = '<div class="title-screen lore"><h3>The world in 2077</h3>' +
      D.lore.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
      '<button class="btn primary" data-act="tocreate">Create your character</button></div>';
  }
  on('tocreate', function () {
    create = { name: '', gender: 'female', nation: null, role: null, age: 40 };
    createScreen();
  });

  function createScreen() {
    var c = create;
    var nations = D.nations.slice().sort(function (a, b) { return b.gdp - a.gdp; });
    var html = '<div class="page" style="padding-bottom:40px">' +
      '<h2 style="margin-top:10px">Create your character</h2>' +
      '<label class="field">Name</label>' +
      '<input type="text" id="cname" maxlength="40" placeholder="e.g. Astrid Lindberg" value="' + esc(c.name) + '" data-input="cname">' +
      '<button class="btn sm" style="margin-top:8px" data-act="randname">🎲 Random name</button>' +
      '<label class="field">Gender</label><div class="seg">' +
      ['female', 'male', 'nonbinary'].map(function (g) {
        return '<button class="' + (c.gender === g ? 'sel' : '') + '" data-act="gender" data-arg="' + g + '">' + { female: 'Female', male: 'Male', nonbinary: 'Non-binary' }[g] + '</button>';
      }).join('') + '</div>' +
      '<label class="field">Age: <span id="agev">' + c.age + '</span></label>' +
      '<input type="range" min="25" max="70" value="' + c.age + '" data-input="age">' +
      '<label class="field">Nation</label>' +
      nations.map(function (n) {
        return '<button class="choice ' + (c.nation === n.id ? 'sel' : '') + '" data-act="pnation" data-arg="' + n.id + '">' +
          '<div class="row"><div class="t"><span class="dot" style="background:' + n.color + '"></span>' + esc(n.name) + '</div><span class="tag">' + n.tier + '</span></div>' +
          '<div class="d">' + D.govs[n.gov].name + ' · Pop ' + U.people(n.pop) + ' · GDP ' + U.money(n.gdp) + '</div>' +
          (c.nation === n.id ? '<div class="d" style="color:#c9d2e0;margin-top:6px">' + esc(n.desc) + '</div>' : '') +
          '</button>';
      }).join('') +
      '<label class="field">Starting role</label>' +
      Object.keys(D.roles).map(function (r) {
        var ro = D.roles[r];
        return '<button class="choice ' + (c.role === r ? 'sel' : '') + '" data-act="prole" data-arg="' + r + '">' +
          '<div class="t">' + ro.icon + ' ' + ro.name + '</div><div class="d">' + esc(ro.desc) + '</div></button>';
      }).join('') +
      '<button class="btn primary" data-act="start" ' + (c.name.trim() && c.nation && c.role ? '' : 'disabled') + '>Begin in 2077</button>' +
      '</div>';
    app.innerHTML = html;
  }
  on('cname', function (v) {
    create.name = v;
    var b = document.querySelector('[data-act=start]');
    if (b) b.disabled = !(v.trim() && create.nation && create.role);
  });
  on('age', function (v) { create.age = +v; $('agev').textContent = v; });
  on('gender', function (g) { create.gender = g; createScreen(); });
  on('pnation', function (id) { create.nation = id; keepScroll(createScreen); });
  on('prole', function (r) { create.role = r; keepScroll(createScreen); });
  on('randname', function () {
    var cul = create.nation ? D.nations.filter(function (n) { return n.id === create.nation; })[0].culture : U.pick(['anglo', 'nordic', 'euro', 'latin', 'pacific']);
    // Names use the game RNG which needs a state; use a temporary one.
    var had = G.state; G.state = { rng: (Math.random() * 4294967296) >>> 0 };
    create.name = G.names.full(cul, create.gender === 'nonbinary' ? null : create.gender);
    G.state = had;
    keepScroll(createScreen);
  });
  on('start', function () {
    if (!(create.name.trim() && create.nation && create.role)) return;
    E.newGame({ name: create.name.trim(), gender: create.gender, nation: create.nation, role: create.role, age: create.age });
    S().event = EV.roll();
    E.save();
    tab = 'home';
    render();
    window.scrollTo(0, 0);
    resumePending();
  });
  function keepScroll(fn) { var y = window.scrollY; fn(); window.scrollTo(0, y); }

  // ---------- main game ----------
  function render() {
    var s = S(), p = s.player, n = E.pn();
    var yrs = E.yearsPerTurn(s.year);
    var head = '<div class="topbar"><div class="row"><div><div class="year">' + s.year + '</div>' +
      '<div class="era">' + E.era(s.year) + ' · ' + (yrs === 1 ? '1 year' : yrs + ' years') + ' per turn</div></div>' +
      '<div class="row"><span class="tag">⚡ ' + s.ap + ' action' + (s.ap === 1 ? '' : 's') + '</span><button class="icon-btn" data-act="menu">☰</button></div></div></div>';
    var body = { home: homeTab, act: actTab, mil: militaryTab, world: worldTab, space: spaceTab, log: logTab }[tab]();
    var tabs = [['home', '🏛️', 'Home'], ['act', '⚡', 'Actions'], ['mil', '🎖️', 'Military'], ['world', '🌍', 'World'], ['space', '🚀', 'Space'], ['log', '📰', 'News']];
    app.innerHTML = '<div class="page">' + head + body + '</div>' +
      '<div class="bottom"><div class="bottom-inner">' +
      '<button class="btn primary endturn" data-act="endturn">End Turn ▸ ' + (s.year + yrs) + '</button>' +
      '<div class="tabs">' + tabs.map(function (t) {
        return '<button class="' + (tab === t[0] ? 'on' : '') + '" data-act="tab" data-arg="' + t[0] + '"><span class="i">' + t[1] + '</span>' + t[2] +
          (t[0] === 'act' && s.ap > 0 ? '' : '') + '</button>';
      }).join('') + '</div></div></div>';
  }
  on('tab', function (t) { tab = t; render(); window.scrollTo(0, 0); });

  function homeTab() {
    var s = S(), p = s.player, n = E.pn(), g = E.gov(n);
    var ms = D.milestones, mi = E.milestoneIndex(n), next = ms[mi + 1];
    var wars = E.warsOf(n);
    var h = '';
    // Character card
    h += '<div class="card"><div class="row"><div><h2>' + esc(p.name) + '</h2>' +
      '<div class="muted small">' + D.roles[p.role].icon + ' ' + esc(E.roleTitle()) + ' · ' + esc(n.short) + '</div></div>' +
      '<div style="text-align:right"><div class="small muted">Age ' + p.age + '</div><div class="small muted">Gen. ' + p.generation + '</div></div></div>' +
      '<div style="margin-top:10px" class="grid2">' +
      '<div><div class="row small"><span>Influence</span><span>' + Math.round(p.influence) + '</span></div>' + bar(p.influence, 'warn') + '</div>' +
      '<div><div class="row small"><span>Popularity</span><span>' + Math.round(p.popularity) + '</span></div>' + bar(p.popularity, 'good') + '</div>' +
      '</div>' +
      '<div class="row small"><span class="muted">Personal wealth</span><b>' + wealthStr(p.wealth) + '</b></div>' +
      '<div class="row small"><span class="muted">Legacy</span><b>' + Math.round(p.legacy) + '</b></div>' +
      (p.candidate ? '<div class="small warn" style="margin-top:6px">🗳️ Running in the ' + (n.lastElection + 4) + ' election</div>' : '') +
      '</div>';
    // Nation card
    h += '<div class="card"><div class="row"><h2><span class="dot" style="background:' + n.color + '"></span>' + esc(n.name) + '</h2></div>' +
      '<div class="muted small" style="margin-bottom:10px">' + g.name +
      (n.leader ? ' · ' + esc(E.title(n)) + ' ' + esc(n.leader.name) + ' (' + n.leader.age + ')' : ' · Ruled by you') +
      (g.elections ? ' · Next election ' + (n.lastElection + 4) : '') + '</div>' +
      '<div class="grid2">' +
      stat('Population', U.people(n.pop)) +
      stat('GDP ' + rankStr(E.rank(n, function (x) { return x.gdp; })), U.money(n.gdp)) +
      stat('Growth', '<span class="' + ((n.growth || 0) >= 0 ? 'good' : 'bad') + '">' + U.pct(n.growth || 0) + '</span>') +
      treasuryStat(n) + balanceStat(n) +
      stat('Military ' + rankStr(E.rank(n, E.power)), U.num(E.power(n))) +
      stat('Tech ' + rankStr(E.rank(n, function (x) { return x.tech; })), n.tech.toFixed(1)) +
      '</div>' +
      '<div style="margin-top:10px"><div class="row small"><span>Stability</span><span>' + Math.round(n.stability) + '</span></div>' + bar(n.stability) +
      '<div class="row small"><span>Government approval</span><span>' + Math.round(n.approval) + '</span></div>' + bar(n.approval) + '</div>' +
      '<div class="small"><span class="muted">Space:</span> ' + ms[mi].name + (next ? ' → ' + next.name + ' (' + Math.floor(n.space) + '/' + next.points + ')' : ' (max)') + '</div>' +
      (next ? bar((n.space - ms[mi].points) / (next.points - ms[mi].points) * 100, '') : '') +
      (wars.length ? '<div style="margin-top:6px">' + wars.map(function (w) {
        var enemy = E.nation(w.a === n.id ? w.b : w.a), sc = w.a === n.id ? w.score : -w.score;
        return '<div class="small"><span class="tag war">⚔️ WAR</span> vs ' + esc(enemy.name) + ': score <b class="' + (sc >= 0 ? 'good' : 'bad') + '">' + Math.round(sc) + '</b> (±100 decides)</div>';
      }).join('') + '</div>' : '<div class="small muted" style="margin-top:6px">At peace</div>') +
      '</div>';
    // Earth
    h += '<div class="card"><div class="row small"><span>🌍 Earth Health</span><span>' + Math.round(s.earth) + '/100</span></div>' + bar(s.earth) +
      '<div class="small muted">World population ' + U.people(E.worldPop()) + ' · ' + E.alive().length + ' nations · ' + s.wars.length + ' active war' + (s.wars.length === 1 ? '' : 's') + '</div></div>';
    // Budget
    if (E.isLeader()) h += budgetCard(n);
    else h += '<div class="card small muted">You do not control the national budget. Gain power to rule ' + esc(n.short) + '. See the Actions tab.</div>';
    return h;
  }

  var SECTOR_LABELS = { mil: '🎖️ Military', econ: '🏗️ Economy', welfare: '🏥 Welfare', sci: '🔬 Science', space: '🚀 Space' };

  function treasuryStat(n) {
    if (n.treasury >= 0) return stat('Treasury', U.money(n.treasury));
    return stat('National debt', '<span class="bad">' + U.money(E.debt(n)) + '</span> <span class="small muted">' + Math.round(E.debtRatio(n) * 100) + '%</span>');
  }
  function balanceStat(n) {
    var b = E.balance(n);
    return stat('Budget / yr', '<span class="' + (b >= 0 ? 'good' : 'bad') + '">' + (b >= 0 ? '+' : '−') + U.money(Math.abs(b)) + '</span>');
  }

  function budgetCard(n) {
    var f = E.funds(n);
    return '<div class="card"><h3>National budget (per year)</h3>' +
      '<div class="slider-row"><div class="row"><span>💰 Tax rate <b id="taxv">' + Math.round(n.tax * 100) + '%</b></span><span class="good" id="revv">+' + U.money(E.revenue(n)) + '</span></div>' +
      '<input type="range" min="8" max="45" value="' + Math.round(n.tax * 100) + '" data-input="tax"></div>' +
      '<div class="small muted" style="margin:-2px 0 12px">Higher taxes bring in more money but hurt approval.</div>' +
      '<h3 style="margin-top:6px">Expenses <span class="small" style="text-transform:none;letter-spacing:0">(% of GDP)</span></h3>' +
      E.SECTORS.map(function (k) {
        return '<div class="slider-row"><div class="row"><span>' + SECTOR_LABELS[k] + ' <b id="sp-' + k + '">' + (n.spend[k] * 100).toFixed(1) + '%</b></span><span class="bad" id="sf-' + k + '">−' + U.money(f[k]) + '</span></div>' +
          '<input type="range" min="0" max="15" step="0.1" value="' + (n.spend[k] * 100).toFixed(1) + '" data-input="spend" data-k="' + k + '"></div>';
      }).join('') +
      '<div id="budget-sum">' + budgetSummary(n) + '</div></div>';
  }

  function line(label, value, cls, bold) {
    return '<div class="delta"' + (bold ? ' style="font-weight:700;font-size:15px"' : '') + '><span>' + label + '</span><span class="' + (cls || '') + '">' + value + '</span></div>';
  }
  function signedMoney(v) { return (v >= 0 ? '+' : '−') + U.money(Math.abs(v)); }

  function budgetSummary(n) {
    var rev = E.revenue(n), sp = E.spending(n), int = E.interest(n), bal = E.balance(n), pj = E.projectCost(n);
    var next = n.treasury + bal, dr = E.debtRatio(n);
    var h = '<div style="margin-top:8px">' +
      line('Tax revenue', '+' + U.money(rev), 'good') +
      line('Spending (' + (sp / n.gdp * 100).toFixed(1) + '% of GDP)', '−' + U.money(sp), 'bad') +
      (pj > 0 ? line('🎖️ Military projects', '−' + U.money(pj), 'bad') : '') +
      (int > 0 ? line('Interest on debt (' + (E.interestRate(n) * 100).toFixed(1) + '%)', '−' + U.money(int), 'bad') : '') +
      line(bal >= 0 ? 'Surplus' : 'Deficit', signedMoney(bal) + ' <span class="small muted">(' + (bal / n.gdp * 100).toFixed(1) + '% of GDP)</span>', bal >= 0 ? 'good' : 'bad', true) +
      '</div><div style="margin-top:10px">';
    if (n.treasury >= 0) h += line('🏦 Treasury', U.money(n.treasury));
    else h += line('📉 National debt', '<span class="bad">' + U.money(E.debt(n)) + '</span> <span class="small muted">(' + Math.round(dr * 100) + '% of GDP)</span>');
    h += line('Next year', next >= 0 ? U.money(next) + ' in treasury' : '<span class="bad">' + U.money(-next) + ' debt</span>', '');
    if (bal < 0 && n.treasury > 0) h += '<div class="small warn" style="margin-top:6px">At this rate the treasury runs dry in ' + Math.max(1, Math.ceil(n.treasury / -bal)) + ' year(s).</div>';
    if (dr > 0.9) h += '<div class="small bad" style="margin-top:6px">⚠️ Debt above 90% of GDP slows growth, raises interest and destabilises the nation.</div>';
    else if (dr > 0.6) h += '<div class="small warn" style="margin-top:6px">Debt above 60% of GDP makes lenders nervous: interest is rising.</div>';
    h += '<div class="small muted" style="margin-top:6px">Actions can be paid with borrowed money, up to ' + Math.round(E.borrowLimit(n) / n.gdp * 100) + '% of GDP in debt.</div>';
    return h + '</div>';
  }

  on('tax', function (v) {
    var n = E.pn(); n.tax = v / 100;
    $('taxv').textContent = v + '%'; $('revv').textContent = '+' + U.money(E.revenue(n));
    refreshBudget(); E.save();
  });
  on('spend', function (v, el) {
    var n = E.pn(), k = el.getAttribute('data-k');
    n.spend[k] = +v / 100;
    $('sp-' + k).textContent = (+v).toFixed(1) + '%';
    refreshBudget(); E.save();
  });
  function refreshBudget() {
    var n = E.pn(), f = E.funds(n);
    E.SECTORS.forEach(function (k) { var b = $('sf-' + k); if (b) b.textContent = '−' + U.money(f[k]); });
    var sum = $('budget-sum'); if (sum) sum.innerHTML = budgetSummary(n);
  }

  function actTab() {
    var s = S(), p = s.player, n = E.pn(), list = A.available();
    var cats = {};
    list.forEach(function (a) { (cats[a.cat] = cats[a.cat] || []).push(a); });
    var funds = !E.isLeader() ? 'Your wealth: <b>' + wealthStr(p.wealth) + '</b>' :
      n.treasury >= 0 ? 'Treasury: <b>' + U.money(n.treasury) + '</b>' : 'Debt: <b class="bad">' + U.money(E.debt(n)) + '</b>';
    var h = '<div class="card row"><div><b>' + s.ap + '</b> action' + (s.ap === 1 ? '' : 's') + ' left this turn</div><div class="small">' + funds + '</div></div>';
    if (!E.isLeader()) h += '<div class="card small muted">' + roleHint() + '</div>';
    Object.keys(cats).forEach(function (c) {
      h += '<h3 style="margin:16px 0 8px">' + c + '</h3>';
      cats[c].forEach(function (a) {
        var used = s.used.indexOf(a.id) >= 0, cost = A.costFor(a), can = A.affordable(a) && s.ap > 0 && !used;
        var costS = cost === 0 ? 'Free' : (E.isLeader() ? U.money(cost) : wealthStr(cost));
        h += '<div class="action ' + (used ? 'used' : '') + '"><div class="row"><div class="name">' + esc(a.name) + '</div><div class="cost">' + costS + '</div></div>' +
          '<div class="desc">' + esc(a.desc) + '</div>' +
          '<button class="btn sm ' + (can ? 'blue' : '') + '" data-act="doaction" data-arg="' + a.id + '" ' + (can ? '' : 'disabled') + '>' + (used ? 'Done' : 'Do it') + '</button></div>';
      });
    });
    return h;
  }

  function roleHint() {
    var p = S().player, n = E.pn(), dem = E.gov(n).elections;
    if (p.role === 'politician') return dem ? 'Path to power: build influence and popularity, declare your candidacy and win the next election (' + (n.lastElection + 4) + ').' : 'Path to power: there are no elections in ' + esc(n.short) + '. Build influence and strike through palace intrigue when stability is low.';
    if (p.role === 'general') return 'Path to power: win the loyalty of the troops (influence). A coup works best when stability is low. ' + (dem ? 'Or declare candidacy and run in an election.' : '');
    if (p.role === 'corporate') return 'Path to power: grow your fortune, buy influence and take over the state. ' + (n.gov === 'corporate' ? 'In a Corporate State the board can make you ruler.' : 'Outside Corporate States, you need enormous influence.') + (dem ? ' You can also run for office.' : '');
    return '';
  }

  on('doaction', function (id) {
    var a = A.list.filter(function (x) { return x.id === id; })[0];
    if (a.target) {
      var ts = A.targets(a);
      if (!ts || !ts.length) { toast('No valid targets.'); return; }
      var n = E.pn();
      var html = '<div class="kicker">' + esc(a.cat) + '</div><h2>' + esc(a.name) + '</h2><p class="muted">' + esc(a.desc) + '</p>';
      if (a.target === 'gov') {
        html += ts.map(function (g) { return '<button class="choice" data-act="target" data-arg="' + id + '|' + g + '"><div class="t">' + D.govs[g].name + '</div><div class="d">' + esc(D.govs[g].desc) + '</div></button>'; }).join('');
      } else {
        html += ts.map(function (t) {
          return '<button class="choice" data-act="target" data-arg="' + id + '|' + t.id + '"><div class="t"><span class="dot" style="background:' + t.color + '"></span>' + esc(t.name) + '</div>' +
            '<div class="d">Military ' + U.num(E.power(t)) + ' (you ' + U.num(E.power(n)) + ') · Relations ' + Math.round(E.relation(n, t)) + '</div></button>';
        }).join('');
      }
      html += '<button class="btn" data-act="close">Cancel</button>';
      modal(html);
      return;
    }
    doAction(id);
  });
  on('target', function (arg) { var parts = arg.split('|'); closeModal(); doAction(parts[0], parts[1]); });

  function doAction(id, target) {
    var res = A.perform(id, target);
    if (res === null) { toast('Cannot do that right now.'); return; }
    render();
    if (S().succession) { showResult(res, resumePending); return; }
    toast(res);
  }

  function showResult(text, next) {
    modal('<p style="font-size:16px">' + esc(text) + '</p><button class="btn primary" data-act="resultok">Continue</button>');
    resultNext = next;
  }
  var resultNext = null;
  on('resultok', function () { closeModal(); var f = resultNext; resultNext = null; if (f) f(); });

  // ---------- military ----------
  var M = G.military;
  function menStr(k) { return U.num(k * 1000); }

  function militaryTab() {
    var n = E.pn(), p = S().player, lead = E.isLeader(), m = n.mil, f = E.funds(n);
    var pers = M.personnelCost(n), invest = f.mil - pers;
    var h = '';
    // Overview
    h += '<div class="card"><div class="row"><h2>🎖️ Armed Forces</h2><span class="tag">#' + E.rank(n, E.power) + ' in the world</span></div>' +
      '<div class="grid2" style="margin-top:8px">' +
      stat('Military power', U.num(E.power(n))) +
      stat('Manpower', menStr(m.men) + ' <span class="small muted">soldiers</span>') +
      stat('Equipment value', U.money(M.equipment(n))) +
      stat('Quality', '×' + M.quality(n).toFixed(2)) +
      stat('Military budget', U.money(f.mil) + '<span class="small muted">/yr</span>') +
      stat('Soldier salaries', '<span class="' + (invest < 0 ? 'bad' : '') + '">' + U.money(pers) + '</span><span class="small muted">/yr</span>') +
      '</div>' +
      '<div class="small muted" style="margin-top:6px">Power = √(equipment × manpower) × quality. Salaries are paid first; the rest buys equipment' +
      (invest < 0 ? '. <span class="bad">⚠️ The budget does not even cover salaries, so equipment is rotting.</span>' : ' (' + U.money(invest) + '/yr).') + '</div>' +
      (p.role === 'general' ? '<div class="row small" style="margin-top:8px"><span>Troop loyalty to you</span><b>' + Math.round(p.influence) + '</b></div>' + bar(p.influence, 'warn') : '') +
      (!lead ? '<div class="small warn" style="margin-top:8px">You are viewing in read-only mode. Only the head of state commands the military.</div>' : '') +
      '</div>';

    // Conscription
    var target = M.targetMen(n);
    h += '<div class="card"><h3>Conscription</h3>' +
      '<div class="row"><span>Rate <b id="cv">' + (m.consc * 100).toFixed(1) + '%</b> of population</span><span id="ct">' + menStr(target) + ' target</span></div>' +
      (lead ? '<input type="range" min="0.2" max="10" step="0.1" value="' + (m.consc * 100).toFixed(1) + '" data-input="consc">' : bar(m.consc * 1000, '')) +
      '<div id="consc-fx">' + conscEffects(n) + '</div></div>';

    // Branches
    var sh = M.shares(n);
    h += '<div class="card"><h3>Branches</h3><div class="small muted" style="margin-bottom:8px">Share of the equipment budget for each branch.</div>';
    M.BRANCHES.forEach(function (b) {
      var info = M.BRANCH_INFO[b], locked = b === 'space' && !M.hasSpace(n);
      var bonus = m.bonus[b] ? ' <span class="good small">+' + Math.round(m.bonus[b] * 100) + '%</span>' : '';
      h += '<div class="slider-row" style="margin-bottom:12px"><div class="row"><span>' + info.icon + ' <b>' + info.name + '</b>' + bonus + '</span>' +
        '<span>' + (locked ? '<span class="muted small">🔒 locked</span>' : '<b id="bs-' + b + '">' + Math.round(sh[b] * 100) + '%</b> <span class="muted small">' + U.money(m.eq[b]) + '</span>') + '</span></div>' +
        (lead && !locked ? '<input type="range" min="0" max="100" value="' + m.alloc[b] + '" data-input="branch" data-k="' + b + '">' : '') +
        '<div class="small muted">' + info.role + '</div></div>';
    });
    h += '</div>';

    // Projects
    var active = m.active, sl = M.slots(n);
    h += '<div class="card"><div class="row"><h3>Military projects</h3><span class="tag">' + active.length + '/' + sl + ' slots</span></div>' +
      '<div class="small muted" style="margin-bottom:8px">Multi-year projects. The yearly cost is added to the national budget. Finished projects give permanent bonuses and unlock new projects. Starting one does not use an action.</div>';
    if (active.length) {
      h += '<div class="small" style="font-weight:700;margin:6px 0">In progress</div>';
      active.forEach(function (a) {
        var pr = M.project(a.id);
        h += '<div class="action"><div class="row"><div class="name">' + pr.icon + ' ' + esc(pr.name) + '</div><div class="cost">' + U.money(pr.cost * n.gdp) + '/yr</div></div>' +
          '<div class="desc">' + esc(pr.desc) + '</div>' +
          '<div class="row small"><span>Year ' + a.progress + ' of ' + pr.years + '</span><span>' + (pr.years - a.progress) + ' year(s) left</span></div>' + bar(a.progress / pr.years * 100, '') +
          (lead ? '<button class="btn sm danger" data-act="cancelproj" data-arg="' + pr.id + '">Cancel</button>' : '') + '</div>';
      });
    }
    var avail = M.PROJECTS.filter(function (pr) { return M.projectState(n, pr) === 'available'; });
    if (avail.length) {
      h += '<div class="small" style="font-weight:700;margin:10px 0 6px">Available</div>';
      avail.forEach(function (pr) {
        var can = lead && active.length < sl;
        h += '<div class="action"><div class="row"><div class="name">' + pr.icon + ' ' + esc(pr.name) + '</div><div class="cost">' + U.money(pr.cost * n.gdp) + '/yr</div></div>' +
          '<div class="desc">' + esc(pr.desc) + '</div>' +
          '<div class="small muted" style="margin-bottom:8px">' + pr.years + ' years · total ≈ ' + U.money(pr.cost * n.gdp * pr.years) + '</div>' +
          (lead ? '<button class="btn sm ' + (can ? 'blue' : '') + '" data-act="startproj" data-arg="' + pr.id + '" ' + (can ? '' : 'disabled') + '>' + (can ? 'Start project' : 'No free slot') + '</button>' : '') + '</div>';
      });
    }
    var locked = M.PROJECTS.filter(function (pr) { return M.projectState(n, pr) === 'locked'; });
    if (locked.length) {
      h += '<div class="small" style="font-weight:700;margin:10px 0 6px">Locked</div>';
      locked.forEach(function (pr) {
        h += '<div class="row small" style="padding:6px 0;border-bottom:1px solid #1a2230"><span>🔒 ' + esc(pr.name) + '</span><span class="muted" style="text-align:right">needs ' + esc(M.lockReason(n, pr)) + '</span></div>';
      });
    }
    if (m.done.length) {
      h += '<div class="small" style="font-weight:700;margin:12px 0 6px">Completed</div>' +
        m.done.map(function (id) { var pr = M.project(id); return '<span class="tag pact" style="margin-bottom:4px">' + pr.icon + ' ' + esc(pr.name) + '</span>'; }).join(' ');
    }
    h += '</div>';

    // Wars
    var wars = E.warsOf(n);
    if (wars.length) {
      h += '<div class="card"><h3>Wars</h3>' + wars.map(function (w) {
        var enemy = E.nation(w.a === n.id ? w.b : w.a), sc = w.a === n.id ? w.score : -w.score;
        return '<div class="row small" style="padding:4px 0"><span>⚔️ vs ' + esc(enemy.short) + ' (power ' + U.num(E.power(enemy)) + ')</span><b class="' + (sc >= 0 ? 'good' : 'bad') + '">' + Math.round(sc) + '</b></div>';
      }).join('') + '<div class="small muted">War score: ±100 decides the war. Use Offensive or Peace in the Actions tab.</div></div>';
    }

    // Ranking
    h += '<div class="card"><h3>World military ranking</h3>';
    E.alive().slice().sort(function (a, b) { return E.power(b) - E.power(a); }).slice(0, 8).forEach(function (x, i) {
      h += '<div class="row small" style="padding:4px 0"><span>' + (i + 1) + '. <span class="dot" style="background:' + x.color + '"></span>' + esc(x.short) + (x === n ? ' (you)' : '') + '</span>' +
        '<span>' + U.num(E.power(x)) + ' <span class="muted">· ' + menStr(x.mil.men) + ' men</span></span></div>';
    });
    return h + '</div>';
  }

  function conscEffects(n) {
    var g = M.conscGrowthPenalty(n), a = M.conscApprovalPenalty(n), sal = M.targetMen(n) * (n.gdp / n.pop) * 0.4 / 1000;
    return '<div class="small" style="margin-top:6px">' +
      '<div class="row"><span class="muted">Salaries at target</span><span>' + U.money(sal) + '/yr</span></div>' +
      '<div class="row"><span class="muted">Economy (lost workforce)</span><span class="' + (g > 0 ? 'bad' : 'good') + '">' + (g > 0 ? '−' + (g * 100).toFixed(1) + '% growth' : 'no effect') + '</span></div>' +
      '<div class="row"><span class="muted">Public approval</span><span class="' + (a > 0 ? 'bad' : 'good') + '">' + (a > 0 ? '−' + a.toFixed(0) : 'no effect') + (a > 0 && E.atWar(n) ? ' (halved in wartime)' : '') + '</span></div>' +
      '<div class="muted" style="margin-top:4px">Up to 1% is free. Above that, conscription hurts the economy and the public mood. Soldiers are recruited gradually over a few years.</div></div>';
  }
  on('consc', function (v) {
    var n = E.pn(); n.mil.consc = +v / 100;
    $('cv').textContent = (+v).toFixed(1) + '%';
    $('ct').textContent = menStr(M.targetMen(n)) + ' target';
    $('consc-fx').innerHTML = conscEffects(n);
    E.save();
  });
  on('branch', function (v, el) {
    var n = E.pn(); n.mil.alloc[el.getAttribute('data-k')] = +v;
    var sh = M.shares(n);
    M.BRANCHES.forEach(function (b) { var x = $('bs-' + b); if (x) x.textContent = Math.round(sh[b] * 100) + '%'; });
    E.save();
  });
  on('startproj', function (id) {
    var n = E.pn();
    if (M.startProject(n, id)) { E.save(); keepScroll(render); toast(M.project(id).name + ' started.'); }
  });
  on('cancelproj', function (id) {
    if (!confirm('Cancel this project? Money already spent is lost.')) return;
    M.cancelProject(E.pn(), id); E.save(); keepScroll(render);
  });

  function worldTab() {
    var me = E.pn();
    var list = E.alive().slice().sort(function (a, b) { return b.gdp - a.gdp; });
    var h = '<h3>Nations of the world</h3><p class="small muted">Sorted by GDP. Tap a nation for details.</p>';
    list.forEach(function (n) {
      var w = me !== n && E.warBetween(me, n), rel = me !== n ? Math.round(E.relation(me, n)) : null;
      h += '<button class="nation-row ' + (n === me ? 'me' : '') + '" data-act="nation" data-arg="' + n.id + '">' +
        '<div class="row"><div><span class="dot" style="background:' + n.color + '"></span><b>' + esc(n.name) + '</b></div>' +
        '<div>' + (w ? '<span class="tag war">WAR</span>' : '') + (rel !== null ? '<span class="tag ' + (rel > 20 ? 'pact' : rel < -30 ? 'war' : '') + '">' + (rel > 0 ? '+' : '') + rel + '</span>' : '<span class="tag">YOU</span>') + '</div></div>' +
        '<div class="meta">' + E.gov(n).name + ' · Pop ' + U.people(n.pop) + ' · GDP ' + U.money(n.gdp) + ' · Mil ' + U.num(E.power(n)) + ' · 🚀 ' + D.milestones[E.milestoneIndex(n)].name + '</div></button>';
    });
    var dead = Object.keys(S().nations).map(E.nation).filter(function (n) { return !n.alive; });
    if (dead.length) h += '<p class="small muted">Fallen nations: ' + dead.map(function (n) { return esc(n.name); }).join(', ') + '</p>';
    return h;
  }
  on('nation', function (id) {
    var n = E.nation(id), me = E.pn(), self = n === me;
    var wars = E.warsOf(n).map(function (w) { return E.nation(w.a === n.id ? w.b : w.a).short; });
    var pacts = S().pacts.filter(function (p) { return p.a === n.id || p.b === n.id; }).map(function (p) { return (p.type === 'trade' ? 'Trade' : 'Non-aggression') + ' with ' + E.nation(p.a === n.id ? p.b : p.a).short; });
    var html = '<div class="kicker">' + esc(n.tier) + '</div><h2><span class="dot" style="background:' + n.color + '"></span>' + esc(n.name) + '</h2>' +
      '<p class="muted small">' + esc(n.desc) + '</p>' +
      '<div class="grid2">' + stat('Government', E.gov(n).name) + stat('Leader', n.leader ? esc(n.leader.name) : esc(S().player.name)) +
      stat('Population', U.people(n.pop)) + stat('GDP', U.money(n.gdp)) + stat('Military', U.num(E.power(n))) + stat('Tech', n.tech.toFixed(1)) +
      stat('Stability', Math.round(n.stability)) + stat('Space', D.milestones[E.milestoneIndex(n)].name) +
      treasuryStat(n) + stat('Tax rate', Math.round(n.tax * 100) + '%') + '</div>' +
      '<p class="small" style="margin-top:10px">' + (wars.length ? '⚔️ At war with ' + wars.join(', ') : 'At peace') + '</p>' +
      (pacts.length ? '<p class="small">🤝 ' + pacts.join(' · ') + '</p>' : '') +
      (!self ? '<p class="small">Relations with you: <b>' + Math.round(E.relation(me, n)) + '</b> · Neighbour: ' + (me.neighbors.indexOf(n.id) >= 0 ? 'yes' : 'no') + '</p>' : '');
    if (!self && E.isLeader()) {
      var dip = [['envoy', 'Send envoys'], ['trade', 'Trade agreement'], ['nap', 'Non-aggression pact'], ['tribute', 'Demand tribute'], ['war', 'Declare war'], ['offensive', 'Major offensive'], ['peace', 'Propose peace']];
      var avail = A.available();
      dip.forEach(function (d) {
        var a = avail.filter(function (x) { return x.id === d[0]; })[0];
        if (!a) return;
        var ts = A.targets(a) || [];
        if (!ts.some(function (t) { return t.id === n.id; })) return;
        var can = A.affordable(a) && S().ap > 0 && S().used.indexOf(a.id) < 0;
        html += '<button class="btn ' + (d[0] === 'war' ? 'danger' : '') + '" data-act="target" data-arg="' + a.id + '|' + n.id + '" ' + (can ? '' : 'disabled') + '>' + d[1] + ' · ' + (A.costFor(a) ? U.money(A.costFor(a)) : 'free') + '</button>';
      });
    }
    html += '<button class="btn" data-act="close">Close</button>';
    modal(html);
  });

  function spaceTab() {
    var s = S(), me = E.pn(), mi = E.milestoneIndex(me);
    var h = '<div class="card"><h3>The Space Race</h3>';
    D.milestones.forEach(function (m, i) {
      var f = s.firsts[i];
      h += '<div class="ms ' + (i <= mi ? 'done' : i === mi + 1 ? 'next' : '') + '"><div class="n">' + (i <= mi ? '✓' : i) + '</div><div>' +
        '<div><b>' + m.name + '</b> <span class="small muted">' + U.num(m.points) + ' pts</span></div>' +
        '<div class="small muted">' + esc(m.desc) + '</div>' +
        (f ? '<div class="small warn">First: ' + esc(E.nation(f.nation).short) + ' (' + f.year + ')</div>' : '') +
        '</div></div>';
    });
    h += '</div><div class="card"><h3>Leaderboard</h3>';
    E.alive().slice().sort(function (a, b) { return b.space - a.space; }).slice(0, 8).forEach(function (n) {
      h += '<div class="row small" style="padding:4px 0"><span><span class="dot" style="background:' + n.color + '"></span>' + esc(n.short) + (n === me ? ' (you)' : '') + '</span><span>' + U.num(n.space) + ' pts</span></div>';
    });
    return h + '</div>';
  }

  function logTab() {
    var h = '<h3>News archive</h3>', y = null;
    S().log.slice(0, 200).forEach(function (l) {
      if (l.year !== y) { y = l.year; h += '<div class="log-year">' + y + '</div>'; }
      h += '<div class="log-item ' + l.type + '">' + esc(l.text) + '</div>';
    });
    return h;
  }

  // ---------- menu ----------
  on('menu', function () {
    var p = S().player;
    modal('<div class="kicker">Menu</div><h2>' + esc(p.dynasty) + ' legacy</h2>' +
      '<p class="small muted">Generation ' + p.generation + ' · Legacy ' + Math.round(p.legacy) + ' · Achievements: ' + (S().achievements.length || 'none yet') + '</p>' +
      '<button class="btn" data-act="howto">How to play</button>' +
      '<button class="btn" data-act="totitle">Save & exit to title</button>' +
      '<button class="btn danger" data-act="abandon">Abandon game</button>' +
      '<button class="btn" data-act="close">Close</button>');
  });
  on('totitle', function () { E.save(); titleScreen(); });
  on('abandon', function () { if (confirm('Delete this save and return to the title screen?')) { E.wipe(); G.state = null; titleScreen(); } });

  // ---------- turn flow ----------
  on('endturn', function () {
    if (S().event) { showEvent(); return; }
    if (S().succession) { showSuccession(); return; }
    if (S().ap > 0 && !confirm('You still have ' + S().ap + ' unused action' + (S().ap === 1 ? '' : 's') + '. End turn anyway?')) return;
    E.endTurn();
    render();
    window.scrollTo(0, 0);
    showSummary();
  });

  function showSummary() {
    var s = S(), sm = s.summary, n = E.pn(), p = s.player;
    if (!sm) { resumePending(); return; }
    var f = sm.from;
    function d(label, a, b, fmt, pctMode) {
      var diff = b - a, cls = diff > 0.0001 ? 'good' : diff < -0.0001 ? 'bad' : 'muted';
      var ds = pctMode ? U.signed((b / a - 1) * 100, 1) + '%' : U.signed(diff, 0);
      return '<div class="delta"><span>' + label + '</span><span>' + fmt(b) + ' <span class="' + cls + '">' + ds + '</span></span></div>';
    }
    var html = '<div class="kicker">' + f.year + ' → ' + s.year + '</div><h2>' + (sm.years === 1 ? 'A year passes' : sm.years + ' years pass') + '</h2>';
    if (f.nation === n.id) {
      html += d('GDP', f.gdp, n.gdp, U.money, true) + d('Population', f.pop, n.pop, U.people, true) +
        d('Military power', f.army, E.power(n), function (v) { return U.num(v); }, true) +
        d('Approval', f.approval, n.approval, Math.round) + d('Stability', f.stability, n.stability, Math.round) +
        d('Tech', f.tech, n.tech, function (v) { return v.toFixed(1); });
      if (f.treasury !== undefined) {
        var tdiff = n.treasury - f.treasury;
        html += '<div class="delta"><span>' + (n.treasury >= 0 ? 'Treasury' : 'National debt') + '</span><span>' +
          U.money(Math.abs(n.treasury)) + ' <span class="' + (tdiff >= 0 ? 'good' : 'bad') + '">' + signedMoney(tdiff) + '</span></span></div>';
      }
    }
    html += d('Your influence', f.influence, p.influence, Math.round) + d('Your popularity', f.popularity, p.popularity, Math.round);
    var news = sm.news.filter(function (x) { return x.type !== 'world'; }).concat(sm.news.filter(function (x) { return x.type === 'world'; })).slice(0, 12);
    if (news.length) html += '<h3 style="margin-top:14px">Headlines</h3>' + news.map(function (x) { return '<div class="log-item ' + x.type + '">' + esc(x.text) + '</div>'; }).join('');
    html += '<button class="btn primary" data-act="summaryok">Continue</button>';
    s.summary = null;
    E.save();
    modal(html);
  }
  on('summaryok', function () { closeModal(); resumePending(); });

  function resumePending() {
    var s = S();
    if (s.succession) return showSuccession();
    if (s.event) return showEvent();
    render();
  }

  function showEvent() {
    var ev = S().event, v = EV.view(ev);
    modal('<div class="kicker">' + S().year + ' · Event</div><h2>' + esc(v.title) + '</h2><p style="font-size:16px">' + esc(v.text) + '</p>' +
      v.choices.map(function (c, i) { return '<button class="choice" data-act="evchoice" data-arg="' + i + '"><div class="t">' + esc(c) + '</div></button>'; }).join(''));
  }
  on('evchoice', function (i) {
    var res = EV.choose(S().event, +i);
    render();
    showResult(res, resumePending);
  });

  function showSuccession() {
    var s = S(), sc = s.succession, p = s.player;
    var opts = E.successorOptions();
    succOpts = opts;
    var html = '<div class="kicker">' + (sc.dead ? 'The end of a chapter' : 'A setback') + '</div><h2>' + (sc.dead ? esc(p.name) : 'Out of power') + '</h2><p style="font-size:16px">' + esc(sc.text) + '</p>';
    if (!sc.dead) html += '<button class="choice sel" data-act="fighton"><div class="t">Fight on as ' + esc(p.name) + '</div><div class="d">Stay in the game as a ' + D.roles[p.role].name + ' and plot your comeback.</div></button>';
    html += '<h3 style="margin-top:12px">' + (sc.dead ? 'Who carries on?' : 'Or pass the torch') + '</h3>';
    opts.forEach(function (o, i) {
      html += '<button class="choice" data-act="successor" data-arg="' + i + '"><div class="t">' + esc(o.name) + ' (' + o.age + ')</div>' +
        '<div class="d">' + (o.kind === 'heir' ? 'Heir' : 'Protégé') + ' · ' + esc(D.roles[o.role].name) + '. ' + esc(o.desc) + '</div></button>';
    });
    modal(html);
  }
  var succOpts = [];
  on('fighton', function () { E.continueAfterLoss(); E.save(); closeModal(); tab = 'act'; resumePending(); });
  on('successor', function (i) {
    E.applySuccessor(succOpts[+i]);
    S().event = null;
    E.save();
    closeModal();
    tab = 'home';
    render();
    toast('A new chapter begins.');
  });

  function start() {
    app = $('app');
    titleScreen();
  }

  return { start: start, render: render };
})();
