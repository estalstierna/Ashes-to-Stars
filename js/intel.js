// Intelligence: every nation has an intelligence agency (0-100). Leaders run covert operations
// against other nations; hostile AI nations run them against you. Operations can be exposed.
var G = window.G || (window.G = {});

G.intel = (function () {
  var U = G.util;
  function E() { return G.engine; }
  function S() { return G.state; }

  // Starting agencies: big, secretive or rich states start stronger.
  var START = { USA: 55, CHN: 60, RUS: 62, EF: 45, IND: 42, PAC: 48, TUR: 40, GULF: 38, SIB: 32, NRD: 40, SGP: 45, CAS: 30, AUS: 32, SAC: 28, MESO: 25, PAU: 25 };
  function ensure(n) {
    if (typeof n.spy !== 'number') n.spy = START[n.id] || 30;
    return n.spy;
  }
  function counter(n) { return (n.counter || 0) > S().year; }
  function log(text) {
    var s = S();
    s.intelLog = s.intelLog || [];
    s.intelLog.unshift({ y: s.year, t: text });
    if (s.intelLog.length > 12) s.intelLog.length = 12;
  }

  // Covert operations. base: chance against an equal agency. heat: relations lost if exposed.
  var OPS = {
    steal:   { name: 'Steal technology', base: 0.38, heat: 25, desc: 'Copy their research. Worth more against nations ahead of you.' },
    sabotage: { name: 'Sabotage industry', base: 0.35, heat: 30, desc: 'Fires, outages and corrupted logistics: their growth −1.2% for 3 years.' },
    military: { name: 'Sabotage the military', base: 0.32, heat: 35, desc: 'Destroy depots and hack command systems: 6% of their equipment is lost.' },
    unrest:  { name: 'Incite unrest', base: 0.36, heat: 30, desc: 'Fund protests and agitators: their stability and approval fall. Lands they occupy grow restless.' },
    coup:    { name: 'Back a coup', base: 0.12, heat: 55, desc: 'Arm and pay plotters to overthrow their government. Rarely works; very costly if exposed.' }
  };

  // Chance that `me` succeeds against `t`.
  function chance(me, t, op) {
    var o = OPS[op], fac = me.id === S().player.nation && G.character ? G.character.standing('intel') : 50;
    var p = o.base + (ensure(me) - ensure(t) - (counter(t) ? 25 : 0)) / 160 + (fac - 50) / 350;
    if (op === 'coup') p += (40 - t.stability) / 150 + (E().gov(t).elections ? -0.08 : 0);
    return U.clamp(p, 0.04, op === 'coup' ? 0.45 : 0.8);
  }

  // Effects of a successful operation by `me` on `t`. Returns a short description.
  function apply(me, t, op) {
    var Ex = E();
    if (op === 'steal') {
      var gain = t.tech > me.tech ? Math.min(3, (t.tech - me.tech) * 0.35) + 0.4 : 0.3;
      me.tech += gain;
      return 'stole research worth +' + gain.toFixed(1) + ' tech';
    }
    if (op === 'sabotage') { Ex.addMod(t, 'growth', -0.012, 3); t.treasury -= t.gdp * 0.005; return 'crippled industry'; }
    if (op === 'military') { G.military.losses(t, 0.06); return 'destroyed military depots'; }
    if (op === 'unrest') {
      t.stability = U.clamp(t.stability - 10, 0, 100); Ex.addMod(t, 'approval', -5, 2);
      Ex.occupiedBy(t).forEach(function (d) { var o = Ex.occupation(d); o.unrest = Math.min(100, o.unrest + 15); });
      return 'stirred up unrest';
    }
    if (op === 'coup') {
      var old = Ex.gov(t).name;
      t.gov = Ex.gov(t).elections ? 'junta' : (me.gov === t.gov ? 'junta' : me.gov);
      if (G.laws) G.laws.resetForGov(t);
      t.leader = Ex.makeLeader(t);
      t.stability = U.clamp(t.stability - 15, 0, 100);
      Ex.changeRel(me, t, 40);
      Ex.chron(t, 'Government overthrown in a coup (' + old + ' → ' + Ex.gov(t).name + ')');
      return 'toppled the government';
    }
    return '';
  }

  // The player runs an operation. Returns the message shown.
  function run(op, targetId) {
    var me = E().pn(), t = E().nation(targetId), Ex = E();
    var ok = U.chance(chance(me, t, op));
    var exposed = U.chance(ok ? (op === 'coup' ? 0.35 : 0.1) : 0.6);
    var msg;
    if (ok) {
      var what = apply(me, t, op);
      msg = 'Success: your agents ' + what + ' in ' + t.name + '.';
      if (op === 'coup') msg = 'The coup succeeds. ' + t.name + ' has a new ' + Ex.gov(t).name + ', led by ' + t.leader.name + ', who owes you everything.';
      log(OPS[op].name + ' in ' + t.short + ': success');
    } else {
      msg = 'The operation in ' + t.name + ' fails.';
      log(OPS[op].name + ' in ' + t.short + ': failed');
    }
    if (exposed) {
      Ex.changeRel(me, t, -OPS[op].heat);
      Ex.addThreat(me, op === 'coup' ? 10 : 3);
      if (Ex.gov(me).elections) G.state.player.popularity = U.clamp(G.state.player.popularity - 4, 0, 100);
      Ex.chron(t, 'Exposed a ' + me.short + ' spy operation (' + OPS[op].name.toLowerCase() + ')');
      Ex.log('🕵️ ' + t.name + ' exposes a ' + me.name + ' operation: ' + OPS[op].name.toLowerCase() + '. Relations plummet.', 'player');
      msg += ' Worse: ' + t.name + ' has exposed your agents. Relations −' + OPS[op].heat + '.';
    } else msg += ok ? ' Nobody knows it was you.' : ' Your agents got out unseen.';
    return msg;
  }

  // Yearly: agencies drift with laws; hostile AI agencies strike at you and at each other.
  function year() {
    var Ex = E(), s = S(), pid = s.player.nation, me = Ex.pn();
    Ex.alive().forEach(function (n) {
      ensure(n);
      var law = G.laws ? G.laws.ensure(n).liberty : null;
      var target = (START[n.id] || 30) + (law === 'security' ? 15 : law === 'liberal' ? -8 : 0);
      n.spy = U.clamp(n.spy + (target - n.spy) * 0.03, 0, 100);
    });
    if (!me || !me.alive) return;
    Ex.alive().forEach(function (a) {
      if (a === me) return;
      var rel = Ex.relation(a, me), atWar = Ex.warBetween(a, me);
      if (rel > -15 && !atWar) return;
      if (!U.chance((atWar ? 0.12 : 0.05) * ensure(a) / 50)) return;
      var op = U.pick(atWar ? ['military', 'sabotage', 'unrest'] : ['steal', 'steal', 'sabotage', 'unrest']);
      var ok = U.chance(chance(a, me, op));
      if (ok) apply(a, me, op);
      // Your own agency and a counter-intelligence sweep may catch them.
      var caught = U.chance(U.clamp(0.25 + (ensure(me) - ensure(a)) / 150 + (counter(me) ? 0.4 : 0), 0.05, 0.9));
      if (caught && Ex.isLeader()) {
        G.events.queue({ id: 'spy-caught', ctx: { oid: a.id, otherName: a.name, op: OPS[op].name.toLowerCase(), ok: ok } });
        log('Caught ' + a.short + ' agents (' + OPS[op].name.toLowerCase() + ')');
      } else if (caught) {
        Ex.changeRel(me, a, -15);
        Ex.log('🕵️ A ' + a.name + ' spy ring is uncovered in ' + me.name + '.', 'player');
      } else if (ok) {
        Ex.log('🕵️ ' + { steal: 'Research data leaks from a lab in ' + me.short + '. Nobody knows who took it.', sabotage: 'A string of mysterious factory fires hits ' + me.short + '.', military: 'Explosions rock a military depot in ' + me.short + '.', unrest: 'Well-funded agitators stir up protests in ' + me.short + '.' }[op], 'player');
      }
    });
    // AI against AI: occasional exposed operations make the news.
    if (U.chance(0.15)) {
      var ns = Ex.alive().filter(function (x) { return x !== me; });
      var a = U.pick(ns), b = U.pick(ns.filter(function (x) { return x !== a && Ex.relation(a, x) < 0; }));
      if (a && b) {
        Ex.changeRel(a, b, -15);
        Ex.log('🕵️ ' + b.name + ' expels diplomats after uncovering a ' + a.name + ' spy ring.', 'world');
      }
    }
  }

  G.events.defs.push({ id: 'spy-caught', w: 0, cond: function () { return false; },
    title: 'Spy ring uncovered',
    text: 'Your counter-intelligence has caught {otherName} agents attempting to {op}. The evidence is overwhelming. What now?',
    choices: [
      { t: 'Expel their diplomats', r: function (c) { E().changeRel(E().pn(), c.o, -20); G.character.change('intel', 3); G.state.player.popularity = U.clamp(G.state.player.popularity + 2, 0, 100); return 'Their embassy is half empty by nightfall. The public approves.'; } },
      { t: 'Trade them back quietly', r: function (c) { E().changeRel(E().pn(), c.o, 6); G.character.change('intel', 5); return 'A quiet exchange on a bridge at dawn. They owe you one.'; } },
      { t: 'Hold a public show trial', r: function (c) { E().changeRel(E().pn(), c.o, -35); E().addMod(E().pn(), 'approval', 4, 2); G.character.change('media', 3); return 'The trial is broadcast worldwide. Relations with {otherName} collapse.'; } }
    ] });

  // Action descriptions come from the operations above.
  if (G.actions) G.actions.list.forEach(function (a) { if (a.op && OPS[a.op]) a.desc = OPS[a.op].desc; });

  return { OPS: OPS, START: START, ensure: ensure, counter: counter, chance: chance, run: run, year: year, log: log };
})();
