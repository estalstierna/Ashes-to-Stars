// Wars: war goals, the moving front line, and peace negotiations with chosen terms.
var G = window.G || (window.G = {});

G.war = (function () {
  var U = G.util;
  function E() { return G.engine; }
  function S() { return G.state; }

  // threat: extra (or less) fear the goal adds when the war is declared.
  var GOALS = {
    conquer:  { name: 'Conquer territory', icon: '🗺️', threat: 0,
      desc: 'Fight for land. At peace you can demand the provinces your armies hold.' },
    tribute:  { name: 'War reparations', icon: '💰', threat: -4,
      desc: 'Force them to pay. A limited war that frightens the world the least.' },
    regime:   { name: 'Regime change', icon: '🏛️', threat: 4,
      desc: 'Topple their government and install a friendly one that becomes your defensive ally.' },
    annex:    { name: 'Total conquest', icon: '👑', threat: 12,
      desc: 'Annex the whole nation. Only possible against a much smaller economy (under 35% of yours). Frightens everyone.' },
    liberate: { name: 'Liberation', icon: '🕊️', threat: -10,
      desc: 'Free a nation they have conquered. The world approves.' }
  };

  function side(w, n) { return w.a === n.id ? 'a' : 'b'; }
  function score(w, n) { return w.a === n.id ? w.score : -w.score; }
  function other(w, n) { return E().nation(w.a === n.id ? w.b : w.a); }
  // Provinces the given nation's armies occupy in this war.
  function occupiedBy(w, n) { return (side(w, n) === 'a' ? w.occA : w.occB) || []; }

  function goalsAgainst(me, t) {
    var out = ['conquer', 'tribute', 'regime'];
    if (t.gdp < me.gdp * 0.35) out.push('annex');
    if (E().occupiedBy(t).length) out.push('liberate');
    return out;
  }

  // ---------- front line ----------
  // Each year the occupied area moves towards a share of the enemy's land set by the war score.
  function front(w) {
    var a = E().nation(w.a), b = E().nation(w.b);
    w.occA = (w.occA || []).filter(function (i) { return S().prov[i] === b.id; });
    w.occB = (w.occB || []).filter(function (i) { return S().prov[i] === a.id; });
    step(w, 'occA', a, b, Math.max(0, w.score));
    step(w, 'occB', b, a, Math.max(0, -w.score));
  }
  // The occupied share of the enemy's LAND (not province count) follows the score:
  // e.g. war score 50 means roughly 25% of their land is under your armies.
  function step(w, key, att, def, sc) {
    var target = sc < 10 ? 0 : sc / 100 * 0.5;
    var list = w[key];
    for (var k = 0; k < 2; k++) {
      var held = G.territory.shareOf(list, def.id);
      if (held < target - 0.02 || (target > 0 && !list.length)) {
        var c = G.territory.frontCandidate(att.id, def.id, list);
        if (c < 0) break;
        list.push(c);
        // Don't overshoot with one huge province unless it is the first foothold.
        if (list.length > 1 && G.territory.shareOf(list, def.id) > target + 0.15) { list.pop(); break; }
      } else if (list.length && held - G.territory.shareOf(list.slice(0, -1), def.id) <= held - target) list.pop();
      else break;
    }
  }

  // ---------- peace terms ----------
  // Each term has a "price" in war score. The other side accepts if your war score
  // (plus war weariness) covers the total price. Concessions have negative prices.
  function terms(w, me) {
    var t = other(w, me), occ = occupiedBy(w, me), theirs = occupiedBy(w, t), out = [];
    var held = G.territory.shareOf(occ, t.id);
    if (occ.length) out.push({ id: 'occupied', name: 'Take the ' + occ.length + ' provinces you occupy', price: Math.round(10 + held * 160),
      desc: 'About ' + Math.round(held * 100) + '% of their land, with its people and economy.' });
    out.push({ id: 'reparations', name: 'Reparations (5% of their GDP)', price: 20, desc: U.money(t.gdp * 0.05) + ' into your treasury.' });
    if (w.goal === 'regime' || score(w, me) > 50) out.push({ id: 'regime', name: 'Regime change', price: 65, desc: 'A friendly government takes over and becomes your defensive ally.' });
    if (t.gdp < me.gdp * 0.35) out.push({ id: 'annex', name: 'Annex ' + t.short + ' entirely', price: 95, desc: 'The nation ceases to exist. Huge threat.' });
    E().occupiedBy(t).forEach(function (d) {
      out.push({ id: 'liberate:' + d.id, name: 'Liberate ' + d.short, price: 45, desc: 'They must free the conquered nation.' });
    });
    if (theirs.length) out.push({ id: 'concede', name: 'Give up the ' + theirs.length + ' provinces they occupy', price: -Math.round(10 + G.territory.shareOf(theirs, me.id) * 160),
      desc: 'A concession: makes them accept more easily.' });
    out.push({ id: 'pay', name: 'Pay them 5% of your GDP', price: -20, desc: 'A concession: ' + U.money(me.gdp * 0.05) + ' from your treasury.' });
    return out;
  }

  function acceptance(w, me, chosen) {
    var all = terms(w, me), total = 0;
    chosen.forEach(function (id) { var t = all.filter(function (x) { return x.id === id; })[0]; if (t) total += t.price; });
    var years = S().year - w.start;
    // War weariness makes both sides keener to stop.
    var margin = score(w, me) + years * 3 - total;
    return { price: total, chance: U.clamp(0.5 + margin / 40, 0.02, 0.98) };
  }

  // Apply chosen terms (assumes the other side accepted). Returns a summary text.
  function apply(w, me, chosen) {
    var t = other(w, me), parts = [], annexed = false;
    var occ = occupiedBy(w, me).slice(), theirs = occupiedBy(w, t).slice();
    chosen.forEach(function (id) {
      if (id === 'occupied' && occ.length) { E().transferProvinces(me, t, occ); parts.push(occ.length + ' provinces'); }
      if (id === 'reparations') { var r = t.gdp * 0.05; t.treasury -= r; me.treasury += r; parts.push('reparations of ' + U.money(r)); }
      if (id === 'regime') {
        t.gov = me.gov; t.leader = E().makeLeader(t); t.stability = Math.max(30, t.stability - 10);
        G.laws.resetForGov(t);
        E().changeRel(me, t, 60); E().formAlliance(me, t, 'defensive');
        parts.push('a new, friendly government in ' + t.short);
      }
      if (id === 'concede' && theirs.length) { E().transferProvinces(t, me, theirs); parts.push('you give up ' + theirs.length + ' provinces'); }
      if (id === 'pay') { var p = me.gdp * 0.05; me.treasury -= p; t.treasury += p; parts.push('you pay ' + U.money(p)); }
      if (id.indexOf('liberate:') === 0) {
        var d = E().nation(id.split(':')[1]);
        if (d && E().liberate(d, t)) { parts.push(d.name + ' is free again'); E().addThreat(me, -10); }
      }
      if (id === 'annex') annexed = true;
    });
    if (annexed) {
      E().annex(me, t);
      E().endWar(w, '🏳️ ' + t.name + ' is annexed by ' + me.name + '.');
      return t.name + ' has been annexed.';
    }
    E().endWar(w, '🕊️ ' + me.name + ' and ' + t.name + ' make peace' + (parts.length ? ': ' + parts.join(', ') + '.' : ' (white peace).'));
    return parts.length ? 'Peace: ' + parts.join(', ') + '.' : 'White peace: the war ends with no changes.';
  }

  // The peace terms that fulfil a war goal (used when the enemy capitulates).
  function goalTerms(w, me) {
    var t = other(w, me), out = [];
    if (w.goal === 'tribute') out = ['reparations'];
    else if (w.goal === 'regime') out = ['regime'];
    else if (w.goal === 'annex') out = t.gdp < me.gdp * 0.35 ? ['annex'] : ['occupied'];
    else if (w.goal === 'liberate') out = E().occupiedBy(t).map(function (d) { return 'liberate:' + d.id; });
    if (out.indexOf('annex') < 0 && occupiedBy(w, me).length && w.goal !== 'liberate') out.unshift('occupied');
    return out;
  }

  // Player proposes peace with chosen terms. Returns { accepted, text }.
  function propose(w, me, chosen) {
    var a = acceptance(w, me, chosen), t = other(w, me);
    if (!U.chance(a.chance)) { E().changeRel(me, t, -3); return { accepted: false, text: t.name + ' rejects your terms. The war goes on.' }; }
    return { accepted: true, text: apply(w, me, chosen) };
  }

  // ---------- AI offers and demands in the player's wars ----------
  function playerWarYear(w) {
    if (w.independence) return;
    var pid = S().player.nation, me = E().nation(pid);
    if (!E().isLeader() || !me || (w.a !== pid && w.b !== pid) || w.offered === S().year) return;
    var mine = score(w, me), t = other(w, me), years = S().year - w.start;
    if ((mine > 45 || (years > 5 && mine > 15)) && U.chance(0.18)) {
      w.offered = S().year;
      G.events.queue({ id: 'peace-offer', ctx: { oid: t.id, otherName: t.name, war: w.id, n: occupiedBy(w, me).length } });
    } else if ((mine < -45 || (years > 5 && mine < -15)) && U.chance(0.18)) {
      w.offered = S().year;
      G.events.queue({ id: 'peace-demand', ctx: { oid: t.id, otherName: t.name, war: w.id, n: occupiedBy(w, t).length } });
    }
  }
  function findWar(id) { return S().wars.filter(function (w) { return w.id === id; })[0]; }

  G.events.defs.push(
    { id: 'peace-offer', w: 0, cond: function () { return false; },
      title: '{otherName} sues for peace',
      text: '{otherName} is losing the war and offers peace: you keep the {n} provinces your armies hold.',
      choices: [
        { t: 'Accept', r: function (c) {
          var w = findWar(c.war); if (!w) return 'The war is already over.';
          var me = E().pn(); return apply(w, me, occupiedBy(w, me).length ? ['occupied'] : []);
        } },
        { t: 'Fight on for more', r: function () { return 'You reject the offer. Your generals promise total victory.'; } }
      ] },
    { id: 'peace-demand', w: 0, cond: function () { return false; },
      title: '{otherName} demands your surrender',
      text: '{otherName} is winning. It offers peace if you give up the {n} provinces it occupies and pay reparations.',
      choices: [
        { t: 'Accept their terms', r: function (c) {
          var w = findWar(c.war); if (!w) return 'The war is already over.';
          var me = E().pn(), t = other(w, me);
          return apply(w, t, (occupiedBy(w, t).length ? ['occupied'] : []).concat(['reparations']));
        } },
        { t: 'Never!', r: function () { E().addMod(E().pn(), 'approval', 2, 1); return 'You refuse. The nation rallies, for now.'; } }
      ] }
  );

  return { GOALS: GOALS, goalsAgainst: goalsAgainst, front: front, occupiedBy: occupiedBy, terms: terms, acceptance: acceptance,
    apply: apply, propose: propose, goalTerms: goalTerms, playerWarYear: playerWarYear, score: score, other: other };
})();
