// Research: the science budget produces research points (RP) every year. RP go into the
// discovery the nation is working on; each discovery gives permanent bonuses and unlocks more.
var G = window.G || (window.G = {});

G.research = (function () {
  var U = G.util;
  function E() { return G.engine; }
  function S() { return G.state; }

  var CATS = {
    economy: { name: 'Economy & Energy', icon: '⚡' },
    society: { name: 'Medicine & Society', icon: '🧬' },
    earth:   { name: 'Environment', icon: '🌱' },
    space:   { name: 'Space', icon: '🚀' },
    defense: { name: 'Defense & Computing', icon: '🛡️' }
  };

  // b = bonus: growth (per year), ceiling (x potential), pop (per year), approval, stability,
  // space (x space progress), earth (Earth Health per year), mil (x military quality),
  // research (x RP), life (years added to leaders' lifespans).
  var TECHS = [
    { id: 'fusion', cat: 'economy', name: 'Commercial Fusion', cost: 150, b: { growth: 0.004, ceiling: 0.05 }, desc: 'Cheap, clean energy for the rebuilding.' },
    { id: 'automation', cat: 'economy', name: 'Automated Factories', cost: 150, b: { growth: 0.004 }, desc: 'Robots rebuild what the war destroyed.' },
    { id: 'smartgrid', cat: 'economy', name: 'Continental Smart Grid', cost: 300, req: ['fusion'], b: { ceiling: 0.06 }, desc: 'Energy flows wherever it is needed.' },
    { id: 'nanofab', cat: 'economy', name: 'Nanofabrication', cost: 700, req: ['automation', 'smartgrid'], b: { growth: 0.004, ceiling: 0.1 }, desc: 'Build anything, atom by atom.' },
    { id: 'agi', cat: 'economy', name: 'Artificial General Intelligence', cost: 1800, req: ['nanofab', 'quantum'], b: { research: 0.3, growth: 0.004 }, desc: 'Machines that think. Research +30%.' },
    { id: 'replicators', cat: 'economy', name: 'Matter Replicators', cost: 7000, req: ['agi'], b: { ceiling: 0.15 }, desc: 'Scarcity becomes a memory.' },

    { id: 'genemed', cat: 'society', name: 'Gene Medicine', cost: 150, b: { pop: 0.002, approval: 3, life: 5 }, desc: 'Cures for the war plagues. Leaders live 5 years longer.' },
    { id: 'edu', cat: 'society', name: 'Digital Universities', cost: 200, b: { research: 0.1 }, desc: 'World-class education for everyone. Research +10%.' },
    { id: 'neural', cat: 'society', name: 'Neural Interfaces', cost: 450, req: ['genemed'], b: { research: 0.15 }, desc: 'Thought-speed computing. Research +15%.' },
    { id: 'edemocracy', cat: 'society', name: 'Digital Governance', cost: 350, req: ['edu'], b: { approval: 4, stability: 2 }, desc: 'Transparent, efficient government.' },
    { id: 'longevity', cat: 'society', name: 'Longevity Therapy', cost: 1200, req: ['neural'], b: { life: 15, approval: 3 }, desc: 'Ageing slows dramatically. Leaders live 15 years longer.' },
    { id: 'psychohistory', cat: 'society', name: 'Societal Simulation', cost: 3500, req: ['agi', 'edemocracy'], b: { stability: 5, approval: 4 }, desc: 'Predict and prevent unrest before it starts.' },
    { id: 'upload', cat: 'society', name: 'Mind Uploading', cost: 9000, req: ['longevity', 'agi'], b: { life: 40, stability: 3 }, desc: 'Death becomes optional for the powerful.' },

    { id: 'decontam', cat: 'earth', name: 'Radiation Cleanup', cost: 120, b: { earth: 0.05 }, desc: 'Scrub the fallout from the Long War.' },
    { id: 'carbon', cat: 'earth', name: 'Carbon Capture', cost: 350, req: ['decontam'], b: { earth: 0.08 }, desc: 'Pull the war smoke out of the sky.' },
    { id: 'rewilding', cat: 'earth', name: 'Engineered Rewilding', cost: 600, req: ['carbon', 'genemed'], b: { earth: 0.1, pop: 0.001 }, desc: 'Forests and wildlife return.' },
    { id: 'terraforming', cat: 'earth', name: 'Planetary Engineering', cost: 2000, req: ['rewilding', 'nanofab'], b: { earth: 0.2, ceiling: 0.08 }, desc: 'Reshape the climate of whole continents.' },

    { id: 'reusable', cat: 'space', name: 'Reusable Heavy Lift', cost: 120, b: { space: 0.1 }, desc: 'Rockets that land and fly again. Space progress +10%.' },
    { id: 'habitats', cat: 'space', name: 'Closed-loop Habitats', cost: 400, req: ['reusable', 'genemed'], b: { space: 0.1, pop: 0.001 }, desc: 'Life support that never runs out.' },
    { id: 'fusiondrive', cat: 'space', name: 'Fusion Drive', cost: 600, req: ['reusable', 'fusion'], b: { space: 0.15 }, desc: 'Mars in weeks, not months.' },
    { id: 'spaceelev', cat: 'space', name: 'Space Elevator', cost: 1500, req: ['fusiondrive', 'nanofab'], b: { space: 0.2, growth: 0.002 }, desc: 'A cable to orbit. Launch costs collapse.' },
    { id: 'warp', cat: 'space', name: 'Alcubierre Drive', cost: 12000, req: ['spaceelev', 'agi'], b: { space: 0.5 }, desc: 'Faster than light. The galaxy opens.' },

    { id: 'materials', cat: 'defense', name: 'Metamaterials', cost: 200, b: { mil: 0.05 }, desc: 'Lighter, stronger armour. Military quality +5%.' },
    { id: 'quantum', cat: 'defense', name: 'Quantum Computing', cost: 500, req: ['automation'], b: { research: 0.15, mil: 0.05 }, desc: 'Unbreakable codes, instant simulations.' },
    { id: 'surveillance', cat: 'defense', name: 'Predictive Security', cost: 400, req: ['quantum'], b: { stability: 4, approval: -2 }, desc: 'Crime and dissent are stopped before they happen. Not everyone likes it.' },
    { id: 'shields', cat: 'defense', name: 'Energy Shields', cost: 2500, req: ['quantum', 'fusiondrive'], b: { mil: 0.2 }, desc: 'Cities protected by force fields. Military quality +20%.' }
  ];
  function tech(id) { return TECHS.filter(function (t) { return t.id === id; })[0]; }

  function ensure(n) {
    if (!n.rs) n.rs = { done: [], active: null, progress: 0, bank: 0, b: {} };
    return n.rs;
  }
  function bonus(n, k) { return (n.rs && n.rs.b[k]) || 0; }
  function recalc(n) {
    var b = {};
    n.rs.done.forEach(function (id) { var t = tech(id); for (var k in t.b) b[k] = (b[k] || 0) + t.b[k]; });
    n.rs.b = b;
  }

  // Research points per year: share of GDP spent on science (so small nations can compete),
  // a little extra for big economies, more as general technology rises.
  function rate(n) {
    var f = E().funds(n), g = E().gov(n);
    var ratio = E().sat(f.sci / n.gdp, 0.05) * 1.1; // diminishing returns on science spending
    return ratio * 1800 * g.sci * (1 + Math.max(0, Math.log10(n.gdp / 500)) * 0.25) * Math.sqrt(n.tech / 80) * (1 + bonus(n, 'research') + G.laws.fx(n, 'research'));
  }

  function state(n, t) {
    var rs = ensure(n);
    if (rs.done.indexOf(t.id) >= 0) return 'done';
    if (rs.active === t.id) return 'active';
    return (t.req || []).every(function (r) { return rs.done.indexOf(r) >= 0; }) ? 'available' : 'locked';
  }
  function available(n) { return TECHS.filter(function (t) { return state(n, t) === 'available'; }); }
  function missing(n, t) { return (t.req || []).filter(function (r) { return ensure(n).done.indexOf(r) < 0; }).map(function (r) { return tech(r).name; }); }

  function start(n, id) {
    var rs = ensure(n), t = tech(id);
    if (!t || state(n, t) !== 'available') return false;
    // Switching keeps the points: unfinished progress goes back to the bank.
    if (rs.active) rs.bank += rs.progress;
    rs.active = id; rs.progress = 0;
    return true;
  }

  function complete(n, t) {
    var rs = n.rs, s = S();
    rs.done.push(t.id);
    rs.active = null; rs.progress = 0;
    recalc(n);
    n.tech += 1;
    s.techFirsts = s.techFirsts || {};
    var first = !s.techFirsts[t.id];
    if (first) s.techFirsts[t.id] = { nation: n.id, year: s.year };
    var mine = n.id === s.player.nation;
    if (mine) {
      s.player.legacy += first ? 4 : 1;
      E().log('🔬 ' + n.name + ' discovers ' + t.name + (first ? ', a first for humanity!' : '.'), 'player');
    } else if (first && t.cost >= 1000) {
      E().log('🔬 ' + n.name + ' is the first to discover ' + t.name + '.', 'world');
    }
  }

  // Yearly: produce RP and spend them on the active discovery. AI (and the player's nation
  // when the player does not rule it) chooses its own research.
  function simulate(n, isAI) {
    var rs = ensure(n);
    rs.bank += rate(n);
    if (!rs.active && isAI) {
      var av = available(n);
      if (av.length) { av.sort(function (a, b) { return a.cost - b.cost; }); start(n, U.pick(av.slice(0, 3)).id); }
    }
    if (rs.active) {
      var t = tech(rs.active);
      rs.progress += rs.bank; rs.bank = 0;
      if (rs.progress >= t.cost) {
        var extra = rs.progress - t.cost;
        complete(n, t);
        rs.bank = extra;
      }
    }
  }

  function eta(n, t) {
    var rs = ensure(n), r = rate(n);
    var have = rs.active === t.id ? rs.progress : rs.bank;
    return r > 0 ? Math.max(0, Math.ceil((t.cost - have) / r)) : Infinity;
  }

  // An immediate boost (e.g. a research grant): years' worth of RP.
  function boost(n, years) { ensure(n).bank += rate(n) * years; }

  return {
    CATS: CATS, TECHS: TECHS, tech: tech, ensure: ensure, bonus: bonus, rate: rate, state: state, available: available,
    missing: missing, start: start, simulate: simulate, eta: eta, boost: boost
  };
})();
