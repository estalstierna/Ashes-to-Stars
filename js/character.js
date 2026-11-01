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

  // Yearly: standings fade, policies and your role win or lose support, influence follows.
  function year() {
    var p = P(), n = E().pn(), f = ensure(p);
    KEYS.forEach(function (k) { f[k] += (25 - f[k]) * 0.04; });
    if (p.role === 'leader') {
      var milShare = E().funds(n).mil / n.gdp;
      change('military', milShare >= 0.04 ? 1 : milShare < 0.02 ? -1.5 : 0);
      change('business', n.tax <= 0.2 ? 1 : n.tax >= 0.3 ? -1.5 : 0);
      change('public', (n.approval - 50) / 25);
      change('intel', 0.5);
    }
    if (p.role === 'general') change('military', 1);
    if (p.role === 'corporate') change('business', 1);
    if (p.role === 'politician') change('public', 0.5);
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

  return { FACTIONS: FACTIONS, KEYS: KEYS, weights: weights, ensure: ensure, standing: standing, change: change, changeAll: changeAll, target: target, year: year, inherit: inherit };
})();
