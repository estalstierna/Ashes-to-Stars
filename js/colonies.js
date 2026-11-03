// Colony management: specialisation, buildings, governors, self-rule and war in space.
// Builds on G.space (bodies, founding, growth, independence).
var G = window.G || (window.G = {});

G.colony = (function () {
  var U = G.util;
  function E() { return G.engine; }
  function S() { return G.state; }
  function SP() { return G.space; }

  // What a colony is for. Each world suits some roles better than others.
  var SPECS = {
    mining:   { name: 'Mining & industry', icon: '⛏️', desc: 'Ships metals, ice and helium-3 home: money for the treasury and faster growth.' },
    research: { name: 'Science station', icon: '🔬', desc: 'Laboratories and telescopes: research points every year.' },
    shipyard: { name: 'Orbital shipyards', icon: '🛰️', desc: 'Builds warships for your Space Force (or speeds up the space programme if you have none).' },
    habitat:  { name: 'Habitats & farms', icon: '🌱', desc: 'Room to live and food to eat: the colony grows faster and its people are more content.' },
    culture:  { name: 'Culture & tourism', icon: '🎭', desc: 'Off-world art, media and tourism: approval at home and fame for you.' }
  };
  var SPEC_KEYS = Object.keys(SPECS);
  var SUIT = {
    moon:     { mining: 1.2, research: 1.0, shipyard: 1.4, habitat: 0.6, culture: 1.3 },
    mars:     { mining: 1.0, research: 1.1, shipyard: 1.0, habitat: 1.4, culture: 1.3 },
    ceres:    { mining: 1.6, research: 0.8, shipyard: 1.2, habitat: 0.5, culture: 0.6 },
    europa:   { mining: 0.8, research: 1.6, shipyard: 0.7, habitat: 1.0, culture: 0.8 },
    ganymede: { mining: 1.1, research: 1.1, shipyard: 1.4, habitat: 0.7, culture: 0.7 },
    titan:    { mining: 1.5, research: 1.1, shipyard: 1.0, habitat: 0.8, culture: 0.8 },
    venus:    { mining: 0.8, research: 1.2, shipyard: 0.6, habitat: 1.1, culture: 1.4 },
    mercury:  { mining: 1.6, research: 1.0, shipyard: 0.9, habitat: 0.4, culture: 0.6 },
    proxima:  { mining: 1.0, research: 1.5, shipyard: 0.8, habitat: 1.4, culture: 1.5 }
  };
  function suit(c, spec) { return (SUIT[c.body] || {})[spec] || 1; }
  function bestSpec(c) { return SPEC_KEYS.slice().sort(function (a, b) { return suit(c, b) - suit(c, a); })[0]; }

  // Buildings: one slot per colony level. cost: share of GDP.
  var BUILDINGS = {
    spaceport: { name: 'Spaceport', cost: 0.004, desc: 'Space progress from this colony +50%; expanding it costs 30% less.' },
    reactor:   { name: 'Fusion reactor', cost: 0.006, desc: 'Everything the colony specialises in +40%.' },
    habitat:   { name: 'Habitat domes', cost: 0.005, desc: 'Room for 60% more people, and they arrive faster.' },
    university: { name: 'University', cost: 0.004, desc: 'Research points from this colony double.' },
    defence:   { name: 'Orbital defence grid', cost: 0.006, desc: 'Guns and shields: much harder to blockade or capture in war.' },
    elevator:  { name: 'Space elevator', cost: 0.012, minLevel: 3, bodies: ['moon', 'mars', 'ganymede', 'titan'], desc: 'A cable to orbit: space progress doubles and trade income +25%.' },
    terraform: { name: 'Terraforming engines', cost: 0.02, minLevel: 4, bodies: ['mars', 'venus', 'proxima'], desc: 'Remake the world: room for three times as many people. Takes generations, makes the colony proud and independent-minded.' }
  };
  function has(c, b) { return (c.bld || []).indexOf(b) >= 0; }
  function slots(c) { return c.level; }
  function canBuild(c, b) {
    var B = BUILDINGS[b];
    return !has(c, b) && (c.bld || []).length < slots(c) && c.level >= (B.minLevel || 1) && (!B.bodies || B.bodies.indexOf(c.body) >= 0);
  }
  function buildCost(n, b) { return n.gdp * BUILDINGS[b].cost * E().diff().cost; }

  // Governors.
  var TRAITS = {
    administrator: { name: 'Administrator', desc: 'Runs a tight ship: output +20%.' },
    loyalist:      { name: 'Loyalist', desc: 'Keeps the colony faithful: the self-rule movement grows half as fast.' },
    visionary:     { name: 'Visionary', desc: 'Inspires scientists and artists: research and culture +30%.' },
    soldier:       { name: 'Soldier', desc: 'A veteran commander: the colony is much harder to capture.' },
    populist:      { name: 'Populist', desc: 'Loved by the colonists: culture +50%, but they want more self-rule.' },
    corrupt:       { name: 'Corrupt', desc: 'Skims the profits: output −15%.' }
  };
  function governor(n) {
    var g = U.chance(0.5) ? 'female' : 'male';
    return { name: G.names.full(n.culture, g), trait: U.pick(Object.keys(TRAITS)) };
  }
  function candidates(c) {
    var key = c.id + ':' + S().year, s = S(), n = E().nation(c.nation);
    s.govCands = s.govCands || {};
    for (var k in s.govCands) if (k.split(':')[1] !== String(s.year)) delete s.govCands[k];
    if (!s.govCands[key]) s.govCands[key] = [governor(n), governor(n), governor(n)];
    return s.govCands[key];
  }

  // Self-rule policy.
  var RULES = {
    direct:  { name: 'Direct rule', out: 1.1, drift: 0.8, desc: 'Governed from Earth. Output +10%, but resentment grows.' },
    charter: { name: 'Charter', out: 1.0, drift: 0, desc: 'A colonial charter with local councils. Balanced.' },
    home:    { name: 'Home rule', out: 0.75, drift: -1.2, desc: 'A colonial parliament runs local affairs. Output −25%, but the independence movement fades.' }
  };

  function ensure(c) {
    if (!c.spec) c.spec = bestSpec(c);
    if (!c.bld) c.bld = [];
    if (!c.rule) c.rule = c.grantedRights ? 'home' : 'charter';
    if (!c.gov && c.nation && E().nation(c.nation)) c.gov = governor(E().nation(c.nation));
    return c;
  }

  // Output multiplier for the colony's specialisation.
  function mult(c) {
    ensure(c);
    var m = suit(c, c.spec) * RULES[c.rule].out;
    var t = c.gov && c.gov.trait;
    if (t === 'administrator') m *= 1.2;
    if (t === 'corrupt') m *= 0.85;
    if ((t === 'visionary') && (c.spec === 'research' || c.spec === 'culture')) m *= 1.3;
    if (t === 'populist' && c.spec === 'culture') m *= 1.5;
    if (has(c, 'reactor')) m *= 1.4;
    if (blockaded(c)) m *= 0.5;
    return m;
  }
  // The colony's weight in its nation: colonists are few but very productive.
  function weight(c, n) { return Math.max(c.pop / Math.max(1, n.pop) * 4, c.level * 0.003); }

  // Everything the colony gives this year (also used for display).
  function produce(c) {
    var n = c.nation && E().nation(c.nation), out = { income: 0, growth: 0, rp: 0, space: 0, eq: 0, approval: 0, popularity: 0 };
    if (!n || c.free) return out;
    ensure(c);
    var b = SP().body(c.body), m = mult(c), w = weight(c, n);
    // Every colony feeds the space programme and some research.
    out.space = b.space * c.level * 0.5 * (has(c, 'spaceport') ? 1.5 : 1) * (has(c, 'elevator') ? 2 : 1);
    out.rp = b.rp * c.level * 0.5 * (has(c, 'university') ? 2 : 1);
    if (c.spec === 'mining') { out.income = n.gdp * Math.min(0.04, w * 0.1 * m) * (has(c, 'elevator') ? 1.25 : 1); out.growth = Math.min(0.012, w * 0.12 * m); }
    if (c.spec === 'research') out.rp += G.research.rate(n) * Math.min(0.6, w * 5 * m) * (has(c, 'university') ? 1.5 : 1) + b.rp * c.level * m;
    if (c.spec === 'shipyard') {
      if (G.military.hasSpace(n)) out.eq = n.gdp * Math.min(0.012, w * 0.04 * m) + n.gdp * 0.0005 * c.level * m;
      else out.space += b.space * c.level * m;
    }
    if (c.spec === 'culture') { out.approval = Math.min(4, 0.6 * c.level * m); out.popularity = 0.25 * c.level * m; }
    return out;
  }
  function totals(n) {
    var t = { income: 0, growth: 0, rp: 0, space: 0, eq: 0, approval: 0, popularity: 0 };
    SP().of(n).forEach(function (c) { var o = produce(c); for (var k in t) t[k] += o[k]; });
    return t;
  }
  // Growth from colonies (replaces the old flat bonus).
  function growth(n) {
    var base = Math.min(0.01, SP().of(n).reduce(function (a, c) { return a + SP().body(c.body).econ * c.level; }, 0));
    return Math.min(0.025, base + totals(n).growth);
  }
  function capMult(c) { return (has(c, 'habitat') ? 1.6 : 1) * (has(c, 'terraform') ? 3 : 1); }
  function popGrowth(c) { ensure(c); return 1 + (c.spec === 'habitat' ? 0.05 * suit(c, 'habitat') : 0) + (has(c, 'habitat') ? 0.02 : 0); }
  function driftMod(c) {
    ensure(c);
    var d = RULES[c.rule].drift, t = c.gov && c.gov.trait;
    if (c.spec === 'habitat') d -= 0.4 * suit(c, 'habitat');
    if (has(c, 'terraform')) d += 0.4;
    if (t === 'populist') d += 0.5;
    return d;
  }
  function driftScale(c) { return c.gov && c.gov.trait === 'loyalist' ? 0.5 : 1; }

  // ---------- war in space ----------
  function blockaded(c) { return (c.blockade || 0) >= S().year; }
  function defence(c) {
    var n = E().nation(c.nation);
    if (!n) return 0;
    var own = n.mil && n.mil.eq ? n.mil.eq.space : 0;
    var local = n.gdp * 0.002 * c.level * (1 + (has(c, 'defence') ? 2 : 0) + (c.gov && c.gov.trait === 'soldier' ? 1 : 0));
    return own + local;
  }
  function assaultChance(att, c) {
    if (!G.military.hasSpace(att)) return 0;
    var a = att.mil.eq.space || 0, d = defence(c);
    return U.clamp(a / (a + d * 1.3 + 1) * 0.9, 0.03, 0.85);
  }
  function capture(att, c) {
    var old = E().nation(c.nation);
    c.nation = att.id; c.autonomy = Math.max(c.autonomy, 40); c.rule = 'direct';
    c.bld = (c.bld || []).filter(function (b) { return b !== 'defence'; });
    c.gov = governor(att); c.blockade = 0;
    if (old) { E().chron(old, 'Lost ' + c.name + ' (' + SP().body(c.body).name + ') to ' + att.name); E().addMod(old, 'approval', -4, 2); }
    E().chron(att, 'Captured ' + c.name + ' on ' + SP().body(c.body).name);
    E().log('🛰️ ' + att.name + ' storms ' + c.name + ' on ' + SP().body(c.body).name + (old ? ', taking it from ' + old.name : '') + '!', [att.id, old && old.id].indexOf(S().player.nation) >= 0 ? 'player' : 'major');
  }
  // The player orders an orbital assault on an enemy colony.
  function assault(colonyId) {
    var me = E().pn(), c = SP().list().filter(function (x) { return String(x.id) === String(colonyId); })[0];
    if (!c || !c.nation) return 'That colony is beyond reach.';
    var owner = E().nation(c.nation);
    if (U.chance(assaultChance(me, c))) { capture(me, c); return 'Your marines take ' + c.name + '. Its people now answer to you.'; }
    me.mil.eq.space *= 0.85;
    return 'The assault on ' + c.name + ' is thrown back. You lose 15% of your Space Force.';
  }
  function enemyColonies(n) {
    return SP().list().filter(function (c) { var o = c.nation && E().nation(c.nation); return o && o.alive && E().warBetween(n, o); });
  }

  // Yearly: apply output, manage AI colonies, fight in space.
  function year() {
    var s = S(), pid = s.player.nation;
    SP().list().forEach(function (c) {
      var n = c.nation && E().nation(c.nation);
      if (!n || !n.alive || c.free) return;
      ensure(c);
      var o = produce(c);
      n.treasury += o.income;
      G.research.ensure(n).bank += o.rp - SP().body(c.body).rp * c.level * 0.5; // base RP is added by G.space
      n.space += o.space - SP().body(c.body).space * c.level * 0.5;             // base space too
      if (o.eq && n.mil && n.mil.eq) n.mil.eq.space += o.eq;
      if (o.approval) E().addMod(n, 'approval', o.approval, 1);
      if (o.popularity && n.id === pid) s.player.popularity = U.clamp(s.player.popularity + o.popularity * 0.2, 0, 100);
      if (c.gov && c.gov.trait === 'corrupt') n.treasury -= n.gdp * 0.0003 * c.level;
      // AI nations run their colonies themselves.
      if (n.id !== pid || !E().isLeader()) {
        if (c.spec !== bestSpec(c) && U.chance(0.05)) c.spec = bestSpec(c);
        if (U.chance(0.04)) {
          var opts = Object.keys(BUILDINGS).filter(function (b) { return canBuild(c, b) && n.treasury > -n.gdp * 0.2; });
          if (opts.length) { var b = U.pick(opts); n.treasury -= buildCost(n, b); c.bld.push(b); }
        }
        if (c.autonomy > 70 && c.rule !== 'home' && U.chance(0.2)) c.rule = 'home';
      }
    });
    // War in space: blockades and assaults.
    s.wars.forEach(function (w) {
      var a = E().nation(w.a), b = E().nation(w.b);
      if (!a || !b || !a.alive || !b.alive || w.independence) return;
      [[a, b], [b, a]].forEach(function (pair) {
        var att = pair[0], def = pair[1];
        if (!G.military.hasSpace(att)) return;
        var cols = SP().of(def);
        if (!cols.length) return;
        // A much stronger space force blockades the enemy's colonies.
        if ((att.mil.eq.space || 0) > (def.mil.eq.space || 0) * 1.5) cols.forEach(function (c) { c.blockade = s.year; });
        if (att.id === pid && E().isLeader()) return; // the player chooses their own assaults
        if (!U.chance(0.15)) return;
        var target = cols.slice().sort(function (x, y) { return defence(x) - defence(y); })[0];
        if (U.chance(assaultChance(att, target))) capture(att, target);
        else att.mil.eq.space *= 0.9;
      });
    });
  }

  // Player management.
  function setSpec(c, spec) { ensure(c); if (c.spec === spec || (c.specSince || 0) + 10 > S().year) return false; c.spec = spec; c.specSince = S().year; return true; }
  function build(c, b) { var n = E().pn(); if (!canBuild(c, b)) return false; n.treasury -= buildCost(n, b); c.bld.push(b); return true; }
  function appoint(c, i) { var g = candidates(c)[i]; if (!g || (c.govSince || 0) + 5 > S().year) return false; c.gov = g; c.govSince = S().year; return true; }
  function setRule(c, r) { ensure(c); if (c.rule === r || (c.ruleSince || 0) + 5 > S().year) return false; c.rule = r; c.ruleSince = S().year; if (r === 'home') c.grantedRights = true; return true; }

  return { SPECS: SPECS, SPEC_KEYS: SPEC_KEYS, SUIT: SUIT, suit: suit, bestSpec: bestSpec, BUILDINGS: BUILDINGS, has: has, slots: slots, canBuild: canBuild, buildCost: buildCost,
    TRAITS: TRAITS, candidates: candidates, RULES: RULES, ensure: ensure, produce: produce, totals: totals, growth: growth, capMult: capMult, popGrowth: popGrowth,
    driftMod: driftMod, driftScale: driftScale, blockaded: blockaded, defence: defence, assaultChance: assaultChance, assault: assault, enemyColonies: enemyColonies,
    governor: governor, year: year, setSpec: setSpec, build: build, appoint: appoint, setRule: setRule };
})();
