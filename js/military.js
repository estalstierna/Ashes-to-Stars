// Military model: manpower (from conscription) + equipment split across branches,
// multiplied by quality (tech and completed projects). Multi-year projects form a tech tree.
var G = window.G || (window.G = {});

G.military = (function () {
  var U = G.util, D = G.data;
  var EQ_DECAY = 0.08;
  var BRANCHES = ['army', 'navy', 'air', 'space'];
  // How much each unit of equipment is worth in combat, per branch.
  var BRANCH_WEIGHT = { army: 1.0, navy: 0.8, air: 1.2, space: 1.6 };
  var BRANCH_INFO = {
    army:  { name: 'Army',  icon: '🪖', role: 'Ground forces. They take and hold territory.' },
    navy:  { name: 'Navy',  icon: '⚓', role: 'Projects power across oceans. A strong navy can strike nations that are not your neighbours.' },
    air:   { name: 'Air Force', icon: '✈️', role: 'Drones, jets and bombers. The highest value per dollar on Earth.' },
    space: { name: 'Space Force', icon: '🛰️', role: 'Orbital weapons and warships. The most powerful branch. Needs the Space Force Command project.' }
  };

  var PROJECTS = [
    { id: 'drones', name: 'Autonomous Drone Swarms', icon: '✈️', years: 3, cost: 0.006, bonus: { air: 0.2 },
      desc: 'Thousands of cheap, AI-piloted drones. Air Force +20%.' },
    { id: 'exo', name: 'Powered Exoskeletons', icon: '🪖', years: 3, cost: 0.005, bonus: { army: 0.2 },
      desc: 'Every infantryman becomes a walking tank. Army +20%.' },
    { id: 'subs', name: 'Fusion Submarine Fleet', icon: '⚓', years: 4, cost: 0.006, bonus: { navy: 0.25 }, reach: true,
      desc: 'Silent subs that never need to surface. Navy +25% and global reach.' },
    { id: 'cyber', name: 'Cyber Warfare Command', icon: '💻', years: 2, cost: 0.004, bonus: { quality: 0.05 },
      desc: 'Cripple enemy power grids before the first shot. All forces +5%.' },
    { id: 'academy', name: 'Grand War College', icon: '🎓', years: 2, cost: 0.003, bonus: { slots: 1, recruit: 0.15 },
      desc: 'Officers trained for modern war. +1 project slot and faster recruitment.' },
    { id: 'railgun', name: 'Railgun Artillery', icon: '🪖', years: 4, cost: 0.008, req: ['exo'], bonus: { army: 0.2, navy: 0.1 },
      desc: 'Hypersonic slugs fired from 300 km away. Army +20%, Navy +10%.' },
    { id: 'stealth', name: 'Hypersonic Stealth Bombers', icon: '✈️', years: 5, cost: 0.009, req: ['drones'], bonus: { air: 0.3 },
      desc: 'Invisible to radar, around the planet in an hour. Air Force +30%.' },
    { id: 'shield', name: 'Missile Defense Shield', icon: '🛡️', years: 5, cost: 0.01, req: ['cyber'], bonus: { defense: 0.25 },
      desc: 'A dome of lasers and interceptors. +25% strength when you are attacked.' },
    { id: 'spaceforce', name: 'Space Force Command', icon: '🛰️', years: 3, cost: 0.008, ms: 1, unlockSpace: true, bonus: {},
      desc: 'Unlocks the Space Force branch: military satellites and orbital troops. Needs a Lunar Outpost.' },
    { id: 'aistaff', name: 'AI General Staff', icon: '🤖', years: 5, cost: 0.01, req: ['cyber'], minTech: 110, bonus: { quality: 0.15 },
      desc: 'A strategic AI that plans every battle. All forces +15%. Needs tech 110.' },
    { id: 'orbital', name: 'Orbital Strike Platforms', icon: '🛰️', years: 6, cost: 0.012, req: ['spaceforce', 'railgun'], bonus: { space: 0.3, quality: 0.1 },
      desc: 'Kinetic rods dropped from orbit. Space Force +30%, all forces +10%.' },
    { id: 'warships', name: 'Interplanetary Warships', icon: '🚀', years: 8, cost: 0.015, req: ['orbital'], ms: 3, bonus: { space: 0.4 }, reach: true,
      desc: 'Fusion-driven battleships. Space Force +40% and reach anywhere. Needs a Mars Landing.' },
    { id: 'nanites', name: 'Nanite Combat Swarms', icon: '🦠', years: 8, cost: 0.015, req: ['aistaff', 'stealth'], minTech: 200, bonus: { army: 0.3, air: 0.2 },
      desc: 'Self-replicating machines that devour enemy armour. Army +30%, Air Force +20%. Needs tech 200.' },
    { id: 'antimatter', name: 'Antimatter Warheads', icon: '☢️', years: 10, cost: 0.02, req: ['warships'], minTech: 250, bonus: { quality: 0.3 },
      desc: 'One gram equals a nuclear arsenal. All forces +30%. Needs tech 250.' },
    { id: 'lance', name: 'Stellar Lance', icon: '☀️', years: 15, cost: 0.03, req: ['antimatter'], ms: 8, bonus: { quality: 0.5 },
      desc: 'Focuses the light of a star into a beam. All forces +50%. Needs a Dyson Swarm.' }
  ];
  function project(id) { return PROJECTS.filter(function (p) { return p.id === id; })[0]; }

  function E() { return G.engine; }
  function S() { return G.state; }

  // ---------- setup ----------
  function defaultConsc(n) { return U.clamp(0.004 + n.aggression * 0.012 + (n.gov === 'junta' ? 0.008 : 0), 0.003, 0.03); }

  function init(n, milFund, armyMult) {
    var consc = defaultConsc(n);
    var men = n.pop * 1000 * consc;
    n.mil = {
      consc: consc, men: men,
      eq: { army: 0, navy: 0, air: 0, space: 0 },
      alloc: { army: 45, navy: 20, air: 25, space: 10 },
      active: [], done: [], bonus: {}
    };
    if (n.id === 'USA' || n.id === 'CHN') { n.mil.done.push('spaceforce'); n.mil.bonus = {}; }
    var invest = Math.max(milFund * 0.3, milFund - personnelCost(n));
    var total = invest / EQ_DECAY * (armyMult || 0.8);
    var sh = shares(n);
    BRANCHES.forEach(function (b) { n.mil.eq[b] = total * sh[b]; });
    recalcBonus(n);
  }

  // ---------- derived values ----------
  function hasSpace(n) { return n.mil.done.indexOf('spaceforce') >= 0; }
  function shares(n) {
    var a = n.mil.alloc, sp = hasSpace(n) ? a.space : 0;
    var t = a.army + a.navy + a.air + sp || 1;
    return { army: a.army / t, navy: a.navy / t, air: a.air / t, space: sp / t };
  }
  // Cost of paying soldiers, in billions per year.
  function personnelCost(n) { return n.mil.men * (n.gdp / n.pop) * 0.4 / 1000; }
  function quality(n) { return (1 + n.tech / 50) * (1 + (n.mil.bonus.quality || 0)) * (1 + G.research.bonus(n, 'mil')); }
  function branchStrength(n, b) { return n.mil.eq[b] * BRANCH_WEIGHT[b] * (1 + (n.mil.bonus[b] || 0)); }
  function equipment(n) { return BRANCHES.reduce(function (a, b) { return a + n.mil.eq[b]; }, 0); }
  function effectiveEquipment(n) { return BRANCHES.reduce(function (a, b) { return a + branchStrength(n, b); }, 0); }
  // Power: manpower and equipment both matter (geometric mean), multiplied by quality.
  function power(n, defending) {
    if (!n.mil) return 0;
    var p = Math.sqrt(Math.max(0, effectiveEquipment(n)) * Math.max(0, n.mil.men)) * quality(n);
    if (defending) p *= 1 + (n.mil.bonus.defense || 0);
    return p;
  }
  function targetMen(n) { return n.pop * 1000 * n.mil.consc; }
  function slots(n) { return 2 + (n.mil.bonus.slots || 0); }
  function projectCost(n) {
    return n.mil.active.reduce(function (a, p) { return a + project(p.id).cost * n.gdp; }, 0);
  }
  function hasReach(n) {
    return n.mil.done.some(function (id) { return project(id).reach; });
  }
  // Long-range strength: navy, air and space can strike beyond your borders.
  function projection(n) { return branchStrength(n, 'navy') + branchStrength(n, 'air') * 0.5 + branchStrength(n, 'space') * 1.5; }

  // Effects of conscription on the economy and on public mood.
  function conscGrowthPenalty(n) { return Math.max(0, n.mil.consc - 0.01) * 0.6; }
  function conscApprovalPenalty(n) {
    var p = Math.max(0, n.mil.consc - 0.01) * 400;
    return E().atWar(n) ? p * 0.5 : p;
  }

  function recalcBonus(n) {
    var b = {};
    n.mil.done.forEach(function (id) {
      var pr = project(id); if (!pr) return;
      for (var k in pr.bonus) b[k] = (b[k] || 0) + pr.bonus[k];
    });
    n.mil.bonus = b;
  }

  // ---------- projects ----------
  function projectState(n, pr) {
    if (n.mil.done.indexOf(pr.id) >= 0) return 'done';
    if (n.mil.active.some(function (a) { return a.id === pr.id; })) return 'active';
    var missing = (pr.req || []).filter(function (r) { return n.mil.done.indexOf(r) < 0; });
    if (missing.length) return 'locked';
    if (pr.minTech && n.tech < pr.minTech) return 'locked';
    if (pr.ms && E().milestoneIndex(n) < pr.ms) return 'locked';
    return 'available';
  }
  function lockReason(n, pr) {
    var out = [];
    (pr.req || []).forEach(function (r) { if (n.mil.done.indexOf(r) < 0) out.push(project(r).name); });
    if (pr.minTech && n.tech < pr.minTech) out.push('tech ' + pr.minTech);
    if (pr.ms && E().milestoneIndex(n) < pr.ms) out.push(D.milestones[pr.ms].name);
    return out.join(', ');
  }
  function startProject(n, id) {
    var pr = project(id);
    if (!pr || projectState(n, pr) !== 'available' || n.mil.active.length >= slots(n)) return false;
    n.mil.active.push({ id: id, progress: 0 });
    return true;
  }
  function cancelProject(n, id) {
    n.mil.active = n.mil.active.filter(function (a) { return a.id !== id; });
  }

  // ---------- yearly simulation ----------
  function simulate(n, milFund, isAI) {
    var m = n.mil;
    if (isAI) aiDecide(n);
    // Recruitment / demobilisation towards the conscription target.
    var speed = 0.3 * (1 + (m.bonus.recruit || 0));
    m.men += (targetMen(n) - m.men) * speed;
    // Pay the soldiers first; what is left buys and maintains equipment.
    var invest = milFund - personnelCost(n);
    var decay = EQ_DECAY + (invest < 0 ? 0.04 : 0); // unpaid troops let gear rot
    var sh = shares(n);
    BRANCHES.forEach(function (b) { m.eq[b] = Math.max(0, m.eq[b] * (1 - decay) + Math.max(0, invest) * sh[b]); });
    // Projects progress one year at a time (their cost is part of the national budget).
    m.active.slice().forEach(function (a) {
      a.progress++;
      var pr = project(a.id);
      if (a.progress >= pr.years) {
        m.active = m.active.filter(function (x) { return x !== a; });
        m.done.push(pr.id);
        recalcBonus(n);
        var mine = n.id === S().player.nation;
        if (mine || pr.years >= 6) E().log(pr.icon + ' ' + n.name + ' completes ' + pr.name + '.', mine ? 'player' : 'world');
        if (mine) S().player.legacy += 2;
      }
    });
  }

  function aiDecide(n) {
    var m = n.mil, target = defaultConsc(n) * (E().atWar(n) ? 2 : 1);
    m.consc += (target - m.consc) * 0.3;
    if (hasSpace(n)) m.alloc.space = 15;
    if (m.active.length < Math.min(slots(n), 2) && U.chance(0.2) && n.treasury > -n.gdp * 0.3) {
      var avail = PROJECTS.filter(function (pr) { return projectState(n, pr) === 'available'; });
      if (avail.length) startProject(n, U.pick(avail).id);
    }
  }

  // ---------- changes from events, wars and actions ----------
  // Scale equipment (and manpower when losing forces).
  function scale(n, f) {
    BRANCHES.forEach(function (b) { n.mil.eq[b] *= f; });
    if (f < 1) n.mil.men *= f;
  }
  // Battle losses: a fraction of equipment and soldiers. Dead soldiers leave the population too.
  function losses(n, frac) {
    frac = U.clamp(frac, 0, 0.5);
    BRANCHES.forEach(function (b) { n.mil.eq[b] *= 1 - frac; });
    var dead = n.mil.men * frac * 0.6;
    n.mil.men -= n.mil.men * frac;
    n.pop = Math.max(0.5, n.pop - dead / 1000);
  }
  function transfer(from, to, frac) {
    BRANCHES.forEach(function (b) { var x = from.mil.eq[b] * frac; from.mil.eq[b] -= x; to.mil.eq[b] += x * 0.5; });
    from.mil.men *= 1 - frac;
  }

  return {
    BRANCHES: BRANCHES, BRANCH_INFO: BRANCH_INFO, PROJECTS: PROJECTS, project: project,
    init: init, simulate: simulate, power: power, quality: quality, equipment: equipment, effectiveEquipment: effectiveEquipment,
    branchStrength: branchStrength, shares: shares, hasSpace: hasSpace, personnelCost: personnelCost, targetMen: targetMen,
    slots: slots, projectCost: projectCost, hasReach: hasReach, projection: projection,
    conscGrowthPenalty: conscGrowthPenalty, conscApprovalPenalty: conscApprovalPenalty,
    projectState: projectState, lockReason: lockReason, startProject: startProject, cancelProject: cancelProject,
    scale: scale, losses: losses, transfer: transfer, defaultConsc: defaultConsc
  };
})();
