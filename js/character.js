// Power base: the character's standing with five factions. Influence drifts towards a
// weighted mix of these standings; which factions matter most depends on the government.
var G = window.G || (window.G = {});

G.character = (function () {
  var U = G.util;
  function E() { return G.engine; }
  function S() { return G.state; }
  function P() { return G.state.player; }

  var FACTIONS = {
    military: { name: 'Military', icon: '🎖️', perk: 'Coups succeed more often and are less likely against you.' },
    business: { name: 'Business elite', icon: '💼', perk: 'Brings personal income every year and helps boardroom takeovers.' },
    media:    { name: 'Media', icon: '📺', perk: 'Your popularity grows on its own.' },
    public:   { name: 'The people', icon: '👥', perk: 'Helps you win elections.' },
    intel:    { name: 'Intelligence services', icon: '🕵️', perk: 'Protects you from assassins and helps palace intrigue.' }
  };
  var KEYS = Object.keys(FACTIONS);

  // How much each faction counts towards influence, by form of government.
  var WEIGHTS = {
    democracy:   { public: 0.35, media: 0.25, business: 0.2, military: 0.1, intel: 0.1 },
    oneparty:    { public: 0.25, intel: 0.25, military: 0.2, business: 0.15, media: 0.15 },
    autocracy:   { military: 0.3, intel: 0.3, business: 0.2, public: 0.1, media: 0.1 },
    junta:       { military: 0.5, intel: 0.2, business: 0.1, public: 0.1, media: 0.1 },
    corporate:   { business: 0.5, media: 0.2, intel: 0.1, military: 0.1, public: 0.1 },
    technocracy: { business: 0.25, public: 0.2, intel: 0.2, military: 0.2, media: 0.15 },
    monarchy:    { military: 0.25, public: 0.25, intel: 0.2, business: 0.2, media: 0.1 }
  };
  function weights(n) { return WEIGHTS[(n || E().pn()).gov] || WEIGHTS.democracy; }

  function initial(role) {
    var f = { military: 20, business: 20, media: 20, public: 20, intel: 20 };
    if (role === 'leader') KEYS.forEach(function (k) { f[k] = 45; });
    if (role === 'politician') { f.public = 45; f.media = 40; }
    if (role === 'general') { f.military = 60; f.intel = 30; }
    if (role === 'corporate') { f.business = 60; f.media = 30; }
    return f;
  }
  function ensure(p) { p = p || P(); if (!p.fac) p.fac = initial(p.role); return p.fac; }
  function standing(k) { return ensure()[k]; }
  function change(k, d) { var f = ensure(); f[k] = U.clamp(f[k] + d, 0, 100); }
  function changeAll(d) { KEYS.forEach(function (k) { change(k, d); }); }

  // The influence your power base supports.
  function target() {
    var f = ensure(), w = weights();
    return KEYS.reduce(function (a, k) { return a + f[k] * w[k]; }, 0);
  }

  // What moves each group's support this year, as named reasons: { faction: [[label, change], ...] }.
  // Shown under each group in the power base and applied once a year.
  function drivers(p, n) {
    p = p || P(); n = n || E().pn();
    var f = ensure(p), out = {}, Ex = E();
    KEYS.forEach(function (k) { out[k] = []; });
    function add(k, label, v) { if (Math.abs(v) >= 0.05) out[k].push([label, v]); }
    KEYS.forEach(function (k) { add(k, 'Support fades without attention', (25 - f[k]) * 0.04); });
    var lead = p.role === 'leader';
    if (lead) {
      var fu = Ex.funds(n), t = Ex.ensureTaxes(n), growth = n.growth || 0;
      // Military: money, wars and a strong army.
      var milShare = fu.mil / n.gdp;
      add('military', 'Military budget ' + (milShare * 100).toFixed(1) + '% of GDP (3% is neutral)', U.clamp((milShare - 0.03) * 60, -2, 2));
      if (Ex.atWar(n)) add('military', 'War footing', 0.6);
      var conscPct = n.mil ? n.mil.consc : 0;
      if (conscPct > 0.015) add('military', 'High conscription', 0.4);
      // Business: taxes on firms and the rich, growth and debt.
      add('business', 'Corporate tax ' + (t.corporate * 100).toFixed(0) + '% (22% is neutral)', U.clamp((0.22 - t.corporate) * 15, -2.5, 2));
      if (t.wealth > 0) add('business', 'Wealth tax ' + (t.wealth * 100).toFixed(1) + '%', -Math.min(3, t.wealth * 100));
      add('business', 'Economic growth ' + (growth * 100).toFixed(1) + '%/yr (2% is neutral)', U.clamp((growth - 0.02) * 60, -1.5, 1.5));
      var trade = S().pacts.filter(function (x) { return x.type === 'trade' && (x.a === n.id || x.b === n.id); }).length;
      if (trade) add('business', 'Trade agreements (' + trade + ')', Math.min(1, trade * 0.3));
      if (Ex.debtRatio(n) > 1) add('business', 'National debt above 100% of GDP', -1);
      // The people: approval, welfare and the taxes they pay.
      add('public', 'Approval ' + Math.round(n.approval) + '% (50% is neutral)', (n.approval - 50) / 25);
      var welShare = fu.welfare / n.gdp;
      add('public', 'Welfare spending ' + (welShare * 100).toFixed(1) + '% of GDP (5% is neutral)', U.clamp((welShare - 0.05) * 40, -1.5, 1.5));
      add('public', 'Income tax ' + (t.income * 100).toFixed(0) + '% (25% is neutral)', U.clamp(-(t.income - 0.25) * 10, -2, 1));
      add('public', 'Consumption tax ' + (t.vat * 100).toFixed(0) + '% (15% is neutral)', U.clamp(-(t.vat - 0.15) * 10, -1.5, 1));
      if (t.wealth > 0) add('public', 'Wealth tax ' + (t.wealth * 100).toFixed(1) + '%', Math.min(2, t.wealth * 60));
      if (Ex.atWar(n)) add('public', 'War weariness', -Math.min(1.5, (n.warYears || 0) * 0.15));
      // Media and the spies.
      add('media', 'Your popularity ' + Math.round(p.popularity) + ' (50 is neutral)', U.clamp((p.popularity - 50) / 40, -1, 1));
      add('intel', 'Serving the head of state', 0.5);
      add('intel', 'Stability ' + Math.round(n.stability) + ' (50 is neutral)', U.clamp((n.stability - 50) / 50, -1, 1));
      // Laws, one line per law that matters to a group.
      if (G.laws) G.laws.LAWS.forEach(function (l) {
        var o = G.laws.option(l.id, G.laws.ensure(n)[l.id]);
        if (o && o.fx.fac) for (var k in o.fx.fac) add(k, 'Law: ' + o.name, o.fx.fac[k]);
      });
    }
    if (p.role === 'general') add('military', 'One of their own (general)', 1);
    if (p.role === 'corporate') add('business', 'One of their own (executive)', 1);
    if (p.role === 'politician') add('public', 'Working the constituency', 0.5);
    if (p.role !== 'leader') add('media', 'Your popularity ' + Math.round(p.popularity), U.clamp((p.popularity - 50) / 60, -0.6, 0.6));
    return out;
  }
  function net(list) { return list.reduce(function (a, d) { return a + d[1]; }, 0); }

  // Yearly: apply every reason, then influence follows the power base.
  function year() {
    var p = P(), n = E().pn(), f = ensure(p), d = drivers(p, n);
    KEYS.forEach(function (k) { f[k] = U.clamp(f[k] + net(d[k]), 0, 100); });
    // Influence moves a quarter of the way to what the power base supports.
    p.influence = U.clamp(p.influence + (target() - p.influence) * 0.25, 0, 100);
    // Income: a salary for office holders plus favours from the business elite ($M).
    var salary = { leader: 2, politician: 0.6, general: 0.5, corporate: 0 }[p.role] || 0;
    p.wealth += salary + f.business * 0.03;
    // A friendly media keeps your name in the news.
    if (p.role !== 'leader') p.popularity = U.clamp(p.popularity + (f.media - 40) * 0.03, 0, 100);
  }

  // Successors inherit part of the network.
  function inherit(oldP, newRole, kind) {
    var base = initial(newRole), old = ensure(oldP), keep = kind === 'heir' ? 0.5 : 0.6, f = {};
    KEYS.forEach(function (k) { f[k] = Math.round(Math.max(base[k], old[k] * keep + base[k] * (1 - keep))); });
    return f;
  }

  return { drivers: drivers, net: net, FACTIONS: FACTIONS, KEYS: KEYS, weights: weights, ensure: ensure, standing: standing, change: change, changeAll: changeAll, target: target, year: year, inherit: inherit };
})();
