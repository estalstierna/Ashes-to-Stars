// Headless simulation: plays full games with random choices to catch crashes, NaN and balance issues.
// Usage: node tests/sim.js [games] [untilYear]
const fs = require('fs'), path = require('path'), vm = require('vm');
const files = ['util', 'names', 'data', 'engine', 'military', 'actions', 'events'];
function boot() {
  const store = {};
  const ctx = { console, Math, JSON, Object, Array, String, Number, Date,
    localStorage: { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; }, removeItem: k => { delete store[k]; } } };
  ctx.window = ctx;
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  return ctx.G;
}
const games = +process.argv[2] || 12, until = +process.argv[3] || 3000;
const roles = ['leader', 'politician', 'general', 'corporate'];
let failures = 0;
for (let g = 0; g < games; g++) {
  const G = boot(), E = G.engine, A = G.actions, EV = G.events;
  const nat = G.data.nations[g % G.data.nations.length].id, role = roles[g % 4];
  E.newGame({ name: 'Test Player', gender: 'female', nation: nat, role, age: 40 });
  let turns = 0, successions = 0, leaderTurns = 0, maxGen = 1;
  const checkpoints = {};
  try {
    while (G.state.year < until && turns < 2000) {
      const s = G.state;
      if (s.succession) {
        if (!s.succession.dead && Math.random() < 0.5) E.continueAfterLoss();
        else { const o = E.successorOptions(); E.applySuccessor(o[Math.floor(Math.random() * o.length)]); successions++; }
      }
      if (s.event) { const v = EV.view(s.event); EV.choose(s.event, Math.floor(Math.random() * v.choices.length)); }
      for (let k = 0; k < 3 && s.ap > 0 && !s.succession; k++) {
        const av = A.available().filter(a => A.affordable(a) && s.used.indexOf(a.id) < 0);
        if (!av.length) break;
        const a = av[Math.floor(Math.random() * av.length)];
        let t;
        if (a.target) { const ts = A.targets(a); if (!ts || !ts.length) continue; const x = ts[Math.floor(Math.random() * ts.length)]; t = typeof x === 'string' ? x : x.id; }
        A.perform(a.id, t);
      }
      if (s.succession) continue;
      if (s.player.role === 'leader') leaderTurns++;
      E.endTurn();
      turns++;
      maxGen = Math.max(maxGen, G.state.player.generation);
      // NaN check
      for (const n of E.alive()) {
        const vals = { pop: n.pop, gdp: n.gdp, tech: n.tech, space: n.space, stability: n.stability, approval: n.approval,
          treasury: n.treasury, men: n.mil.men, power: E.power(n), equipment: G.military.equipment(n) };
        for (const k in vals) if (!isFinite(vals[k])) throw new Error(`NaN ${k} in ${n.id} at ${G.state.year}`);
      }
      for (const y of [2100, 2200, 2500, 3000]) if (!checkpoints[y] && G.state.year >= y) {
        const top = E.alive().slice().sort((a, b) => b.gdp - a.gdp).slice(0, 3).map(n => `${n.id}:${G.util.money(n.gdp)}/t${n.tech.toFixed(0)}/${G.data.milestones[E.milestoneIndex(n)].name.split(' ')[0]}`);
        const mil = E.alive().slice().sort((a, b) => E.power(b) - E.power(a)).slice(0, 3).map(n => `${n.id}:${G.util.num(E.power(n))}/${G.util.num(n.mil.men * 1000)}men/${n.mil.done.length}proj/debt${Math.round(E.debtRatio(n) * 100)}%`);
        checkpoints[y] = `${y}: nations=${E.alive().length} wars=${G.state.wars.length} earth=${G.state.earth.toFixed(0)} pop=${G.util.people(E.worldPop())} top=${top.join(' ')}\n      mil=${mil.join(' ')}`;
      }
    }
    const firsts = Object.keys(G.state.firsts).map(i => `${i}@${G.state.firsts[i].year}`).join(' ');
    console.log(`#${g} ${nat}/${role}: turns=${turns} year=${G.state.year} gens=${maxGen} leaderTurns=${leaderTurns} ach=${G.state.achievements.join(',')}`);
    Object.values(checkpoints).forEach(c => console.log('   ' + c));
    console.log('   firsts: ' + firsts);
  } catch (e) {
    failures++;
    console.log(`#${g} ${nat}/${role} FAILED at ${G.state.year}:`, e.stack);
  }
}
console.log(failures ? `${failures} FAILED` : 'ALL OK');
process.exit(failures ? 1 : 0);
