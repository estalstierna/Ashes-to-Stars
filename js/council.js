// The World Council: founded at the Geneva Armistice. Every few years a resolution is tabled,
// debated for a year (you can lobby) and put to a vote weighted by economic size.
var G = window.G || (window.G = {});

G.council = (function () {
  var U = G.util;
  function E() { return G.engine; }
  function S() { return G.state; }
  function C() {
    var s = S();
    s.council = s.council || { next: 2079, pending: null, active: [], history: [] };
    return s.council;
  }
  function biggestThreat() {
    return E().alive().filter(function (n) { return (n.threat || 0) >= 30; }).sort(function (a, b) { return b.threat - a.threat; })[0];
  }
  function biggestWar() {
    return S().wars.filter(function (w) { return !w.parent && !w.independence; })
      .sort(function (a, b) { return E().nation(b.a).gdp + E().nation(b.b).gdp - E().nation(a.a).gdp - E().nation(a.b).gdp; })[0];
  }
  function hasSpaceForce(n) { return n.mil && n.mil.done && n.mil.done.indexOf('spaceforce') >= 0; }

  // Resolution types. `stance(n, r)` > 0 means the nation leans yes.
  var TYPES = {
    sanctions: { name: 'Sanctions on {t}', years: 8,
      desc: 'All members cut trade with {t}: its growth −1.2% for 8 years and its trade agreements end.',
      stance: function (n, r) { var t = E().nation(r.target); if (n === t) return -3; if (E().allied(n, t)) return -1.5; return -E().relation(n, t) / 40 + (t.threat || 0) / 50 - (E().hasPact(n, t, 'trade') ? 0.5 : 0); },
      pass: function (r) { var t = E().nation(r.target); E().addMod(t, 'growth', -0.012, 8); E().addMod(t, 'approval', -3, 2); S().pacts = S().pacts.filter(function (p) { return !(p.type === 'trade' && (p.a === t.id || p.b === t.id)); }); E().chron(t, 'Sanctioned by the World Council'); } },
    climate: { name: 'Earth Restoration Accord', years: 10,
      desc: 'Every nation cuts emissions: the Earth heals faster for 10 years, but all economies grow 0.2% slower.',
      stance: function (n) { var l = G.laws ? G.laws.ensure(n).environment : ''; return 0.4 + (70 - S().earth) / 60 + (l === 'green' ? 1 : l === 'industry' ? -1 : 0) - (n.gdp / worldGdp() > 0.15 ? 0.5 : 0); },
      pass: function () { E().alive().forEach(function (n) { E().addMod(n, 'growth', -0.002, 10); }); } },
    science: { name: 'Open Science Accord', years: 10,
      desc: 'Members share research: every nation researches 10% faster for 10 years. Leaders lose their edge.',
      stance: function (n) { var avg = E().alive().reduce(function (a, x) { return a + x.tech; }, 0) / E().alive().length; return 0.5 + (avg - n.tech) / 10; } },
    aid: { name: 'Reconstruction Fund', years: 10,
      desc: 'The four richest nations pay 0.4% of GDP a year; the poorer half of the world grows 0.5% faster for 10 years.',
      stance: function (n) { var rich = richest(); return rich.indexOf(n) >= 0 ? -1.2 : poorHalf().indexOf(n) >= 0 ? 1.4 : 0.3; },
      pass: function () { poorHalf().forEach(function (n) { E().addMod(n, 'growth', 0.005, 10); }); } },
    arms: { name: 'Arms Limitation Treaty', years: 0,
      desc: 'Every nation scraps 8% of its military equipment. Fear of everyone eases (threat −10) and relations warm.',
      stance: function (n) { var top = E().alive().slice().sort(function (a, b) { return E().power(b) - E().power(a); }).slice(0, 3); return (top.indexOf(n) >= 0 ? -1.1 : 0.8) - (E().atWar(n) ? 0.6 : 0); },
      pass: function () { var ns = E().alive(); ns.forEach(function (n) { G.military.losses(n, 0.08); n.threat = Math.max(0, (n.threat || 0) - 10); }); for (var i = 0; i < ns.length; i++) for (var j = i + 1; j < ns.length; j++) E().changeRel(ns[i], ns[j], 3); } },
    orbital: { name: 'Orbital Weapons Ban', years: 0,
      desc: 'Space Forces are cut by a quarter worldwide. Nations without one are safer.',
      cond: function () { return E().alive().some(hasSpaceForce); },
      stance: function (n) { return hasSpaceForce(n) ? -1.2 : 0.8; },
      pass: function () { E().alive().forEach(function (n) { if (n.mil && n.mil.eq) n.mil.eq.space *= 0.75; }); } },
    ceasefire: { name: 'Ceasefire: {a} must stop attacking {t}', years: 0,
      desc: 'Condemns {a} for its war on {t}. If it passes, {a} is shamed (threat +10, relations fall) and may agree to peace.',
      stance: function (n, r) { var a = E().nation(r.attacker), t = E().nation(r.target); if (n === a || E().warBetween(n, t)) return -3; if (n === t || E().warBetween(n, a)) return 3; return 0.5 + (E().relation(n, t) - E().relation(n, a)) / 80; },
      pass: function (r) {
        var a = E().nation(r.attacker), t = E().nation(r.target), w = E().warBetween(a, t);
        E().addThreat(a, 10);
        E().alive().forEach(function (n) { if (n !== a && n !== t) E().changeRel(n, a, -6); });
        E().chron(a, 'Condemned by the World Council for its war on ' + t.name);
        if (w && a.id !== S().player.nation && U.chance(0.5)) E().endWar(w, '🕊️ Under pressure from the World Council, ' + a.name + ' makes peace with ' + t.name + '.');
        if (a.id === S().player.nation) E().addMod(a, 'approval', -4, 2);
      } }
  };
  function worldGdp() { return E().alive().reduce(function (a, n) { return a + n.gdp; }, 0); }
  function richest() { return E().alive().slice().sort(function (a, b) { return b.gdp - a.gdp; }).slice(0, 4); }
  function poorHalf() { var ns = E().alive().slice().sort(function (a, b) { return a.gdp / a.pop - b.gdp / b.pop; }); return ns.slice(0, Math.ceil(ns.length / 2)); }

  function title(r) {
    var T = TYPES[r.type], t = r.target && E().nation(r.target), a = r.attacker && E().nation(r.attacker);
    return T.name.replace('{t}', t ? t.name : '').replace('{a}', a ? a.name : '');
  }
  function desc(r) {
    var T = TYPES[r.type], t = r.target && E().nation(r.target), a = r.attacker && E().nation(r.attacker);
    return T.desc.replace(/\{t\}/g, t ? t.name : '').replace(/\{a\}/g, a ? a.name : '');
  }
  function active(type) { return C().active.some(function (x) { return x.type === type && x.until > S().year; }); }

  // Resolutions that could be tabled now (also offered to the player).
  // A resolution that was voted on recently rests (10 years if passed, 12 if it failed).
  function failedRecently(r) { return C().history.some(function (h) { return h.title === title(r) && S().year - h.y < (h.passed ? 10 : 12); }); }
  function options() { return allOptions().filter(function (r) { return !failedRecently(r); }); }
  function allOptions() {
    var out = [], th = biggestThreat(), w = biggestWar();
    if (th) out.push({ type: 'sanctions', target: th.id });
    if (w) out.push({ type: 'ceasefire', attacker: w.a, target: w.b });
    if (!active('climate') && S().earth < 85) out.push({ type: 'climate' });
    if (!active('science')) out.push({ type: 'science' });
    if (!active('aid')) out.push({ type: 'aid' });
    out.push({ type: 'arms' });
    if (TYPES.orbital.cond()) out.push({ type: 'orbital' });
    return out;
  }
  // Sanctions the player could propose against any rival.
  function playerOptions() {
    var me = E().pn(), out = options().filter(function (r) { return r.type !== 'sanctions'; });
    E().alive().filter(function (n) { return n !== me && E().relation(me, n) < 0 && !E().allied(me, n); }).forEach(function (n) { out.push({ type: 'sanctions', target: n.id }); });
    return out;
  }
  function key(r) { return [r.type, r.target || '', r.attacker || ''].join(':'); }
  function fromKey(k) { var p = k.split(':'); return { type: p[0], target: p[1] || null, attacker: p[2] || null }; }

  // Each nation's vote: 'yes', 'no' or 'abstain'. Lobbying by the player sways nations that like them.
  function voteOf(n, r) {
    var me = E().pn(), s = TYPES[r.type].stance(n, r) + (r.noise && r.noise[n.id] || 0);
    if (n !== me && r.lobby) s += r.lobby * (E().relation(n, me) > 0 ? 0.35 : 0.15);
    return s > 0.3 ? 'yes' : s < -0.3 ? 'no' : 'abstain';
  }
  function weight(n) { return Math.sqrt(n.gdp); }
  function tally(r, playerVote) {
    var me = E().pn(), out = { yes: [], no: [], abstain: [], wYes: 0, wNo: 0 };
    E().alive().forEach(function (n) {
      var v = n === me && playerVote ? playerVote : voteOf(n, r);
      out[v].push(n);
      if (v === 'yes') out.wYes += weight(n); if (v === 'no') out.wNo += weight(n);
    });
    out.passes = out.wYes > out.wNo && out.yes.length >= 3;
    return out;
  }

  function table(r, by) {
    var c = C();
    r.year = S().year; r.by = by || null; r.lobby = 0; r.noise = {};
    E().alive().forEach(function (n) { r.noise[n.id] = (U.rand() - 0.5) * 0.8; });
    c.pending = r;
    E().log('🏛️ World Council: ' + (by ? E().nation(by).name + ' tables' : 'tabled for next year') + ' "' + title(r) + '".', by === S().player.nation ? 'player' : 'world');
  }

  function resolve(playerVote) {
    var c = C(), r = c.pending;
    if (!r) return null;
    var t = tally(r, playerVote);
    c.pending = null;
    c.history.unshift({ y: S().year, title: title(r), passed: t.passes, yes: t.yes.length, no: t.no.length });
    if (c.history.length > 8) c.history.length = 8;
    var T = TYPES[r.type];
    if (t.passes) {
      if (T.pass) T.pass(r);
      if (T.years) c.active.push({ type: r.type, target: r.target || null, title: title(r), until: S().year + T.years });
    }
    E().log('🏛️ World Council ' + (t.passes ? 'passes' : 'rejects') + ' "' + title(r) + '" (' + t.yes.length + ' for, ' + t.no.length + ' against).', 'major');
    return t;
  }

  // Yearly: active resolutions run, expire; new ones are tabled and voted on.
  function year() {
    var c = C(), s = S();
    c.active = c.active.filter(function (a) { return a.until > s.year; });
    if (active('climate')) s.earth = U.clamp(s.earth + 0.15, 0, 100);
    if (active('aid')) richest().forEach(function (n) { n.treasury -= n.gdp * 0.004; });
    if (c.pending && s.year > c.pending.year) {
      var ts = c.pending.target && E().nation(c.pending.target);
      if ((c.pending.target && (!ts || !ts.alive)) || (c.pending.type === 'ceasefire' && !E().warBetween(E().nation(c.pending.attacker), ts))) { c.pending = null; return; }
      if (E().isLeader()) G.events.queue({ id: 'council-vote', ctx: { oid: c.pending.target || E().pn().id, res: title(c.pending) } });
      else resolve(null);
      return;
    }
    if (!c.pending && s.year >= c.next) {
      var opts = options();
      if (opts.length) table(U.pick(opts));
      c.next = s.year + U.randInt(3, 5);
    }
  }

  // Research bonus while the Open Science Accord is in force.
  function fx(n, kind) { return kind === 'research' && active('science') ? 0.1 : 0; }

  G.events.defs.push({ id: 'council-vote', w: 0, cond: function () { return false; },
    title: 'World Council vote',
    text: 'The World Council votes on "{res}". How does your delegation vote?',
    choices: ['yes', 'no', 'abstain'].map(function (v) {
      return { t: { yes: 'Vote for', no: 'Vote against', abstain: 'Abstain' }[v], r: function () {
        var r = C().pending;
        if (!r) return 'The vote has already been held.';
        var t = resolve(v), txt = desc(r);
        return 'The resolution ' + (t.passes ? 'passes' : 'fails') + ', ' + t.yes.length + ' for and ' + t.no.length + ' against. ' + (t.passes ? txt : '');
      } };
    }) });

  return { C: C, TYPES: TYPES, title: title, desc: desc, options: options, playerOptions: playerOptions, key: key, fromKey: fromKey,
    voteOf: voteOf, tally: tally, table: table, resolve: resolve, active: active, year: year, fx: fx };
})();
