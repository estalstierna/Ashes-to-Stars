// Runs every choice of every event in several game situations; fails on exceptions or NaN.
// Usage: node tests/events.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const files = ['util', 'names', 'data', 'lore', 'flags', 'engine', 'military', 'research', 'laws', 'character', 'mapdata', 'territory', 'actions', 'events', 'events-extra', 'war', 'space', 'cabinet'];
function boot() {
  const ctx = { console, Math, JSON, Object, Array, String, Number, Date, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } };
  ctx.window = ctx; vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  return ctx.G;
}
const setups = [
  { nation: 'USA', role: 'leader', years: 0 }, { nation: 'NRD', role: 'leader', years: 120 }, { nation: 'CHN', role: 'leader', years: 500 },
  { nation: 'RUS', role: 'general', years: 30 }, { nation: 'IND', role: 'politician', years: 60 }, { nation: 'PAC', role: 'corporate', years: 200 }
];
let runs = 0, fails = 0;
const seen = new Set();
for (const st of setups) {
  const G = boot(), E = G.engine;
  E.newGame({ name: 'Test Person', gender: 'female', nation: st.nation, role: st.role, age: 60 });
  // Age the world a bit so late-game conditions can be met.
  while (G.state.year < 2077 + st.years) {
    if (G.state.succession) { if (!G.state.succession.dead) E.continueAfterLoss(); else E.applySuccessor(E.successorOptions()[0]); }
    G.state.event = null; G.state.eventQueue = [];
    E.endTurn();
  }
  if (G.state.player.role !== st.role) { G.state.player.role = st.role; if (st.role === 'leader') E.pn().leader = null; }
  // Make conditional events reachable.
  const n = E.pn(); n.warYears = 3; if (st.role !== 'leader' && !E.atWar(n)) { const t = E.alive().find(x => x !== n); E.declareWar(n, t, { quiet: true, noAllies: true }); }
  for (const d of G.events.defs) {
    if (d.w === 0) continue;
    const snap = JSON.stringify(G.state);
    let ok = true;
    try { ok = !d.cond || d.cond(); } catch (e) { ok = false; console.log('COND FAIL', d.id, e.message); fails++; }
    if (!ok) continue;
    const o = d.pick ? d.pick() : E.alive().find(x => x !== n);
    if (!o) continue;
    for (let i = 0; i < d.choices.length; i++) {
      G.state = JSON.parse(snap);
      try {
        const c = { o: E.nation(o.id), otherName: o.name, other: o.name, person: 'A Person', company: 'Acme' };
        if (d.ctx) d.ctx(c);
        const store = {}; for (const k in c) if (k !== 'o') store[k] = c[k]; store.oid = o.id;
        G.events.view({ id: d.id, ctx: store });
        const res = G.events.choose({ id: d.id, ctx: store }, i);
        if (typeof res !== 'string') throw new Error('no result text');
        for (const x of E.alive()) for (const k of ['pop', 'gdp', 'tech', 'treasury', 'stability', 'approval']) if (!isFinite(x[k])) throw new Error('NaN ' + k + ' in ' + x.id);
        for (const k of ['influence', 'popularity', 'wealth']) if (!isFinite(G.state.player[k])) throw new Error('NaN player ' + k);
        E.endTurn(); // the game must keep running afterwards
        runs++; seen.add(d.id);
      } catch (e) { fails++; console.log('FAIL', st.nation, st.role, d.id, 'choice', i, e.message); }
    }
    G.state = JSON.parse(snap);
  }
}
console.log(`ran ${runs} choices, covered ${seen.size} events` + (fails ? `, ${fails} FAILED` : ', ALL OK'));
process.exit(fails ? 1 : 0);
