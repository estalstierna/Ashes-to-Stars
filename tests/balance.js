// Balance check: an aggressive bot plays a nation and tries to conquer as fast as it can.
// Prints how much land and GDP it holds by a given year on each difficulty.
// Usage: node tests/balance.js [nation] [untilYear] [games]
const fs = require('fs'), path = require('path'), vm = require('vm');
const files = ['util', 'names', 'data', 'lore', 'flags', 'engine', 'military', 'research', 'laws', 'character', 'mapdata', 'territory', 'actions', 'events', 'events-extra', 'war', 'space', 'cabinet', 'intel', 'council'];
function boot() {
  const ctx = { console, Math, JSON, Object, Array, String, Number, Date, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} } };
  ctx.window = ctx; vm.createContext(ctx);
  for (const f of files) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  return ctx.G;
}
const nation = process.argv[2] || 'USA', until = +process.argv[3] || 2150, games = +process.argv[4] || 6, mode = process.argv[5] || 'war';
for (const difficulty of ['easy', 'normal', 'hard', 'brutal']) {
  let tech = 0, ms = 0, land = 0, gdpShare = 0, annexed = 0, coalitions = 0, survived = 0;
  for (let g = 0; g < games; g++) {
    const G = boot(), E = G.engine, A = G.actions;
    E.newGame({ name: 'Bot', gender: 'female', nation, role: 'leader', age: 30, difficulty });
    while (G.state.year < until) {
      const s = G.state;
      if (s.succession) { if (!s.succession.dead) E.continueAfterLoss(); else E.applySuccessor(E.successorOptions()[0]); }
      let k = 0; while (G.state.event && k++ < 10) G.events.choose(G.state.event, 0);
      if (s.player.role === 'leader' && mode === 'econ') {
        // Min-maxer: maximum investment, high taxes, repeat the best actions every turn.
        const n = E.pn();
        Object.assign(n.spend, { econ: 0.1, sci: 0.08, space: 0.05, welfare: 0.04, mil: 0.03 }); G.engine.scaleTaxes(n, 0.31);
        for (const id of ['infra', 'research', 'welfare', 'mission']) if (s.ap > 0) A.perform(id);
      } else if (s.player.role === 'leader') {
        const n = E.pn();
        n.spend.mil = 0.07; // war economy
        const enemies = E.enemiesOf(n);
        if (!enemies.length) {
          const t = A.targets(A.list.find(a => a.id === 'war')).sort((a, b) => E.power(a) - E.power(b))[0];
          if (t && E.power(n) > E.power(t) * 1.5) A.perform('war', t.id);
        } else {
          const e = enemies[0], w = E.warBetween(n, e), mine = w.a === n.id ? w.score : -w.score;
          if (mine > 60) A.perform('peace', e.id); else A.perform('offensive', e.id);
        }
        if (s.ap > 0) A.perform('mobilize');
      }
      E.endTurn();
    }
    const n = E.pn(), wg = E.alive().reduce((a, x) => a + x.gdp, 0);
    if (process.env.DEBUG) console.log(n.id, Math.round(n.gdp), Math.round(wg), E.alive().map(x => x.id + ":" + Math.round(x.gdp)).join(" "));
    tech += n.tech / Math.max(...E.alive().filter(x => x !== n).map(x => x.tech)); ms += E.milestoneIndex(n);
    land += G.territory.landShare(n.id); gdpShare += n.gdp / wg;
    annexed += Object.values(G.state.nations).filter(x => !x.alive && x.annexedBy === n.id).length;
    coalitions += G.state.log.filter(l => l.text.includes('coalition forms against ' + n.name)).length;
    survived += n.id === nation ? 1 : 0;
  }
  console.log(`${mode} ${difficulty.padEnd(7)} by ${until}: land ${(land / games * 100).toFixed(0)}%  world GDP ${(gdpShare / games * 100).toFixed(0)}%  nations annexed ${(annexed / games).toFixed(1)}  coalitions ${(coalitions / games).toFixed(1)}  still ${nation} ${survived}/${games}  tech vs best AI x${(tech / games).toFixed(2)}  space step ${(ms / games).toFixed(1)}`);
}
