// Laws & policies: one active option per area. Options shape growth, approval, stability,
// research, space, the Earth, military quality, conscription and faction support.
var G = window.G || (window.G = {});

G.laws = (function () {
  function E() { return G.engine; }
  function S() { return G.state; }

  // fx keys: growth (per yr), approval, stability, pop (per yr), research (x), space (x), earth (per yr),
  // mil (x military quality), consc (x conscription unrest), threat (x threat gained), fac: { faction: per-year change }.
  var LAWS = [
    { id: 'press', name: 'Speech & press', icon: '📰', options: [
      { id: 'free', name: 'Free press', desc: 'Journalists can criticise anyone. Ideas flow, scandals too.', fx: { approval: 3, stability: -2, research: 0.05, fac: { media: 0.6 } } },
      { id: 'managed', name: 'Managed media', desc: 'Licences and "guidance" for broadcasters. Calmer, duller news.', fx: { stability: 3, approval: -1, fac: { media: -0.3, intel: 0.3 } } },
      { id: 'propaganda', name: 'State propaganda', desc: 'The state owns the message. Very stable, until it is not.', fx: { stability: 6, approval: -3, research: -0.05, fac: { media: -1, intel: 0.6 } } }
    ] },
    { id: 'service', name: 'Military service', icon: '🎖️', options: [
      { id: 'volunteer', name: 'Volunteer army', desc: 'Only those who want to serve. Popular, but conscription above 1% is resented twice as much.', fx: { approval: 2, consc: 2, fac: { military: -0.3 } } },
      { id: 'selective', name: 'Selective service', desc: 'A lottery fills the ranks when needed.', fx: {} },
      { id: 'universal', name: 'Universal service', desc: 'Everyone serves. Conscription causes half the unrest, the generals love it, the economy loses workers.', fx: { consc: 0.5, growth: -0.002, fac: { military: 0.8 } } }
    ] },
    { id: 'economy', name: 'Economic model', icon: '🏭', options: [
      { id: 'market', name: 'Free market', desc: 'Low regulation, high inequality. Faster growth, angrier workers.', fx: { growth: 0.005, approval: -2, fac: { business: 0.8, public: -0.4 } } },
      { id: 'mixed', name: 'Mixed economy', desc: 'Markets with a safety net.', fx: {} },
      { id: 'planned', name: 'Planned economy', desc: 'The state directs investment. Stable and fair, but sluggish.', fx: { growth: -0.004, stability: 3, approval: 1, fac: { business: -0.8, public: 0.3 } } }
    ] },
    { id: 'environment', name: 'Environment', icon: '🌱', options: [
      { id: 'industry', name: 'Industry first', desc: 'Smokestacks mean jobs. The planet pays.', fx: { growth: 0.003, earth: -0.08, fac: { business: 0.3 } } },
      { id: 'balanced', name: 'Balanced rules', desc: 'Some protection, some pollution.', fx: {} },
      { id: 'green', name: 'Green mandate', desc: 'Strict limits and huge clean-up programmes. Heals the Earth, costs growth.', fx: { growth: -0.003, earth: 0.12, approval: 2, fac: { business: -0.3, public: 0.2 } } }
    ] },
    { id: 'ai', name: 'Artificial intelligence', icon: '🤖', options: [
      { id: 'unrestricted', name: 'Unrestricted AI', desc: 'Machines may do anything humans can. Research soars, jobs vanish.', fx: { research: 0.15, growth: 0.002, stability: -3 } },
      { id: 'regulated', name: 'Regulated AI', desc: 'AI under human oversight.', fx: {} },
      { id: 'ban', name: 'AI ban', desc: 'No thinking machines. Safe, slow and very human.', fx: { research: -0.15, stability: 2, approval: 1 } }
    ] },
    { id: 'migration', name: 'Immigration', icon: '🛂', options: [
      { id: 'open', name: 'Open borders', desc: 'Refugees and workers welcome. More people and growth, more friction.', fx: { pop: 0.003, growth: 0.002, stability: -2, fac: { business: 0.3, public: -0.2 } } },
      { id: 'controlled', name: 'Controlled migration', desc: 'Quotas and work permits.', fx: {} },
      { id: 'closed', name: 'Closed borders', desc: 'Nobody gets in. Nationalists cheer; the population ages.', fx: { pop: -0.001, stability: 2, approval: 1, fac: { public: 0.2, business: -0.3 } } }
    ] },
    { id: 'liberty', name: 'Civil liberties', icon: '⚖️', options: [
      { id: 'liberal', name: 'Strong rights', desc: 'Courts protect citizens from the state. Popular, but spies and police have their hands tied.', fx: { approval: 3, stability: -1, fac: { intel: -0.5, public: 0.3 } } },
      { id: 'standard', name: 'Standard rights', desc: 'The usual balance.', fx: {} },
      { id: 'security', name: 'Security state', desc: 'Surveillance, curfews, detention without trial. Order at a price.', fx: { stability: 5, approval: -4, fac: { intel: 0.8, media: -0.4 } } }
    ] },
    { id: 'space', name: 'Space policy', icon: '🚀', options: [
      { id: 'public', name: 'Public programme', desc: 'A national space agency leads the way.', fx: {} },
      { id: 'private', name: 'Private space race', desc: 'Corporations compete for contracts. Faster, but profits come first.', fx: { space: 0.15, fac: { business: 0.4 } } },
      { id: 'military', name: 'Militarised space', desc: 'Space is the high ground. Your forces gain an edge, rivals grow nervous.', fx: { space: 0.05, mil: 0.05, threat: 1.2, fac: { military: 0.4 } } }
    ] }
  ];
  function law(id) { return LAWS.filter(function (l) { return l.id === id; })[0]; }
  function option(lawId, optId) { var l = law(lawId); return l && l.options.filter(function (o) { return o.id === optId; })[0]; }

  // Starting laws by form of government.
  var DEFAULTS = {
    democracy:   { press: 'free', service: 'volunteer', economy: 'mixed', environment: 'balanced', ai: 'regulated', migration: 'controlled', liberty: 'liberal', space: 'public' },
    oneparty:    { press: 'propaganda', service: 'selective', economy: 'planned', environment: 'industry', ai: 'regulated', migration: 'closed', liberty: 'security', space: 'public' },
    autocracy:   { press: 'propaganda', service: 'universal', economy: 'mixed', environment: 'industry', ai: 'regulated', migration: 'closed', liberty: 'security', space: 'military' },
    junta:       { press: 'managed', service: 'universal', economy: 'mixed', environment: 'industry', ai: 'regulated', migration: 'closed', liberty: 'security', space: 'military' },
    corporate:   { press: 'managed', service: 'volunteer', economy: 'market', environment: 'industry', ai: 'unrestricted', migration: 'open', liberty: 'standard', space: 'private' },
    technocracy: { press: 'managed', service: 'selective', economy: 'mixed', environment: 'green', ai: 'unrestricted', migration: 'controlled', liberty: 'standard', space: 'public' },
    monarchy:    { press: 'managed', service: 'selective', economy: 'mixed', environment: 'balanced', ai: 'regulated', migration: 'closed', liberty: 'standard', space: 'public' }
  };

  function ensure(n) {
    if (!n.laws) n.laws = Object.assign({}, DEFAULTS[n.gov] || DEFAULTS.democracy);
    return n.laws;
  }
  // Sum of a numeric effect over all active laws (multipliers return a factor, default 1).
  function fx(n, key) {
    var laws = ensure(n), sum = 0, mult = 1;
    LAWS.forEach(function (l) {
      var o = option(l.id, laws[l.id]); if (!o) return;
      var v = o.fx[key];
      if (v === undefined) return;
      if (key === 'consc' || key === 'threat') mult *= v; else sum += v;
    });
    return key === 'consc' || key === 'threat' ? mult : sum;
  }
  function factionDrift(n) {
    var laws = ensure(n), out = {};
    LAWS.forEach(function (l) {
      var o = option(l.id, laws[l.id]); if (!o || !o.fx.fac) return;
      for (var k in o.fx.fac) out[k] = (out[k] || 0) + o.fx.fac[k];
    });
    return out;
  }

  var COOLDOWN = 5;
  function cooldown(n, lawId) { var c = (n.lawCool || {})[lawId] || 0; return Math.max(0, c - S().year); }
  function set(n, lawId, optId) {
    ensure(n);
    if (!option(lawId, optId) || n.laws[lawId] === optId) return false;
    n.laws[lawId] = optId;
    n.lawCool = n.lawCool || {}; n.lawCool[lawId] = S().year + COOLDOWN;
    E().addMod(n, 'approval', -2, 1); // any change upsets someone
    return true;
  }
  // When an AI nation changes its form of government, its laws follow.
  function resetForGov(n) { n.laws = Object.assign({}, DEFAULTS[n.gov] || DEFAULTS.democracy); }

  return { LAWS: LAWS, law: law, option: option, ensure: ensure, fx: fx, factionDrift: factionDrift, cooldown: cooldown, set: set, resetForGov: resetForGov, COOLDOWN: COOLDOWN };
})();
