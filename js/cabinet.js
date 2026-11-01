// Cabinet & rivals: named ministers with competence, loyalty and traits who shape your
// government, and persistent rivals who grow in power, attack you and plot against you.
var G = window.G || (window.G = {});

G.cabinet = (function () {
  var U = G.util;
  function E() { return G.engine; }
  function S() { return G.state; }
  function P() { return G.state.player; }

  var POSTS = {
    finance:  { name: 'Finance', icon: '💰', effect: '+0.15% growth per ★' },
    defense:  { name: 'Defence', icon: '🎖️', effect: '+2% military quality per ★' },
    foreign:  { name: 'Foreign Affairs', icon: '🌐', effect: 'Relations with the world improve each year (more per ★)' },
    interior: { name: 'Interior', icon: '🏛️', effect: '+1 stability per ★' },
    science:  { name: 'Science', icon: '🔬', effect: '+4% research per ★' }
  };
  var POST_IDS = Object.keys(POSTS);
  var TRAITS = {
    brilliant: { name: 'Brilliant', good: true, desc: 'Counts as one star better.' },
    loyal:     { name: 'Loyal', good: true, desc: 'Stays loyal through thick and thin.' },
    popular:   { name: 'Popular', good: true, desc: '+1.5 approval.' },
    reformer:  { name: 'Reformer', good: true, desc: '+0.1% growth.' },
    dove:      { name: 'Dove', good: true, desc: 'Less threat from your wars, better relations.' },
    hawk:      { name: 'Hawk', good: null, desc: '+3% military quality, but your wars frighten the world more.' },
    hardliner: { name: 'Hardliner', good: null, desc: '+2 stability, −1 approval.' },
    corrupt:   { name: 'Corrupt', good: false, desc: 'Skims money from the treasury and may cause scandals.' },
    ambitious: { name: 'Ambitious', good: false, desc: 'Loyalty slips; may resign and become a rival.' }
  };
  var TRAIT_IDS = Object.keys(TRAITS);

  // ---------- people ----------
  function person(n, extra) {
    var g = G.names.randomGender();
    return Object.assign({ id: ++S().personSeq, name: G.names.full(n.culture, g), gender: g, age: U.randInt(38, 66) }, extra || {});
  }
  function minister(n, post) {
    var traits = [];
    if (U.chance(0.75)) traits.push(U.pick(TRAIT_IDS));
    if (U.chance(0.25)) { var t2 = U.pick(TRAIT_IDS); if (traits.indexOf(t2) < 0) traits.push(t2); }
    return person(n, { post: post, comp: U.randInt(1, 5), loyalty: traits.indexOf('loyal') >= 0 ? 80 : U.randInt(35, 70), traits: traits, since: S().year });
  }
  function stars(m) { return Math.min(6, m.comp + (has(m, 'brilliant') ? 1 : 0)); }
  function has(m, t) { return m && m.traits && m.traits.indexOf(t) >= 0; }

  function init() {
    var s = S();
    s.personSeq = s.personSeq || 0;
    s.cabinet = s.cabinet || null;
    s.rivals = s.rivals || [];
    s.candidates = {};
    var n = E().pn();
    if (!s.cabinet && E().isLeader()) newCabinet(n);
    while (s.rivals.length < 3) addRival(n);
  }
  function ensure() { if (!S().rivals || S().personSeq === undefined) init(); }

  function newCabinet(n) {
    var c = {};
    POST_IDS.forEach(function (p) { c[p] = minister(n, p); });
    S().cabinet = c;
  }

  var RIVAL_ROLES = {
    opposition: { name: 'Opposition leader', icon: '🎙️' },
    general:    { name: 'Ambitious general', icon: '🎖️' },
    tycoon:     { name: 'Media tycoon', icon: '📺' },
    insider:    { name: 'Regime insider', icon: '🕴️' },
    exminister: { name: 'Former minister', icon: '🧳' }
  };
  function addRival(n, role, from) {
    var have = S().rivals.map(function (r) { return r.role; });
    if (!role) role = U.pick(['opposition', 'general', 'tycoon', 'insider'].filter(function (r) { return have.indexOf(r) < 0; }).concat(['opposition']));
    if (role === 'opposition' && !E().gov(n).elections) role = 'insider';
    var r = from ? Object.assign({}, from, { role: role }) : person(n, {});
    r.role = role; r.nation = n.id;
    r.power = r.power || U.randInt(25, 50); r.hostility = r.hostility || U.randInt(30, 60);
    r.traits = (r.traits || []).filter(function (t) { return t !== 'loyal'; });
    if (!r.traits.length && U.chance(0.6)) r.traits.push(U.pick(['ambitious', 'popular', 'hawk', 'corrupt', 'brilliant', 'hardliner']));
    S().rivals.push(r);
    return r;
  }
  function rival(id) { return (S().rivals || []).filter(function (r) { return String(r.id) === String(id); })[0]; }

  // ---------- effects on your government ----------
  function fx(n, key) {
    var s = S();
    if (!s.cabinet || !E().isLeader() || n.id !== s.player.nation) return 0;
    var c = s.cabinet, v = 0;
    function m(p) { return c[p]; }
    if (key === 'growth') { if (m('finance')) v += stars(m('finance')) * 0.0015; POST_IDS.forEach(function (p) { if (has(m(p), 'reformer')) v += 0.001; }); }
    if (key === 'mil') { if (m('defense')) v += stars(m('defense')) * 0.02; POST_IDS.forEach(function (p) { if (has(m(p), 'hawk')) v += 0.03; }); }
    if (key === 'stability') { if (m('interior')) v += stars(m('interior')); POST_IDS.forEach(function (p) { if (has(m(p), 'hardliner')) v += 2; }); }
    if (key === 'approval') POST_IDS.forEach(function (p) { if (has(m(p), 'popular')) v += 1.5; if (has(m(p), 'hardliner')) v -= 1; });
    if (key === 'research') { if (m('science')) v += stars(m('science')) * 0.04; }
    if (key === 'diplo') { if (m('foreign')) v += stars(m('foreign')) * 0.25; POST_IDS.forEach(function (p) { if (has(m(p), 'dove')) v += 0.5; }); }
    if (key === 'threat') { v = 1; POST_IDS.forEach(function (p) { if (has(m(p), 'hawk')) v *= 1.1; if (has(m(p), 'dove')) v *= 0.9; }); }
    return v;
  }

  // ---------- yearly ----------
  function year() {
    ensure();
    var s = S(), p = P(), n = E().pn(), pid = n.id;
    // A cabinet exists while you rule; a new ruler forms a new one.
    if (E().isLeader() && !s.cabinet) newCabinet(n);
    if (!E().isLeader()) s.cabinet = null;
    if (s.cabinet) {
      POST_IDS.forEach(function (post) {
        var m = s.cabinet[post]; if (!m) return;
        m.age++;
        var target = 50 + (p.influence - 50) * 0.5 + (has(m, 'loyal') ? 30 : 0) - (has(m, 'ambitious') ? 15 : 0);
        m.loyalty = U.clamp(m.loyalty + (target - m.loyalty) * 0.15, 0, 100);
        if (has(m, 'corrupt')) {
          n.treasury -= n.gdp * 0.0015;
          if (U.chance(0.06)) G.events.queue({ id: 'minister-scandal', ctx: { oid: pid, otherName: n.name, mid: m.id, mname: m.name, post: post, postName: POSTS[post].name } });
        }
        if (m.age > 72 && U.chance(0.15)) { E().log('👋 ' + m.name + ', Minister of ' + POSTS[post].name + ', retires.', 'player'); s.cabinet[post] = minister(n, post); }
        else if (has(m, 'ambitious') && m.loyalty < 30 && U.chance(0.12)) {
          E().log('🚪 ' + m.name + ' resigns as Minister of ' + POSTS[post].name + ' and joins your rivals!', 'player');
          addRival(n, 'exminister', Object.assign({}, m, { power: 30 + stars(m) * 5, hostility: 65 }));
          s.cabinet[post] = minister(n, post);
        }
      });
      // A good foreign minister warms relations.
      var d = fx(n, 'diplo');
      if (d) E().alive().forEach(function (o) { if (o !== n && !E().warBetween(o, n)) o.rel[pid] = U.clamp((o.rel[pid] || 0) + d, -100, 100); });
    }
    rivalsYear(n);
  }

  function rivalsYear(n) {
    var s = S(), p = P(), dem = E().gov(n).elections;
    s.rivals = s.rivals.filter(function (r) {
      if (r.nation !== n.id) return false; // you moved nation: old rivals are left behind
      r.age++;
      if (r.age > 74 && U.chance(0.12)) { E().log('⚰️ Your rival ' + r.name + ' has died.', 'player'); return false; }
      return true;
    });
    s.rivals.forEach(function (r) {
      // Rivals grow when you are weak and unpopular.
      var mood = (50 - p.popularity) * 0.06 + (50 - n.approval) * 0.03 + (has(r, 'popular') ? 0.5 : 0) + (has(r, 'ambitious') ? 0.5 : 0);
      r.power = U.clamp(r.power + mood + U.randInt(-2, 2) - 0.3, 5, 100);
      r.hostility = U.clamp(r.hostility + U.randInt(-2, 2) - 0.3, 0, 100);
      if (!U.chance(r.power / 100 * r.hostility / 100 * 0.6)) return;
      // Rival moves.
      if (r.role === 'general' && p.role === 'leader' && n.stability < 35 && r.power > 60 && U.chance(0.25)) {
        if (U.chance(0.5 - C('military') / 250)) {
          E().log('💥 Your rival General ' + r.name + ' stages a coup!', 'player');
          n.gov = 'junta'; n.leader = { name: r.name, gender: r.gender, age: r.age, since: s.year };
          p.role = 'politician'; p.influence = Math.round(p.influence * 0.4);
          s.succession = { reason: 'coup-survived', text: 'General ' + r.name + ' overthrew you. You escaped with your life. Plot your comeback, or pass the torch.' };
          s.rivals = s.rivals.filter(function (x) { return x !== r; });
          return;
        }
        E().log('🛡️ A coup plot by General ' + r.name + ' fails. Loyal troops stood by you.', 'player'); r.power -= 25; G.character.change('military', 3);
        return;
      }
      if (r.role === 'tycoon' && U.chance(0.5)) { G.character.change('media', -5); p.popularity = U.clamp(p.popularity - 3, 0, 100); E().log('📺 ' + r.name + '\'s networks run a week of attacks on you.', 'player'); return; }
      p.popularity = U.clamp(p.popularity - U.randInt(2, 6), 0, 100);
      E().log('🗣️ Your rival ' + r.name + ' leads a smear campaign against you.', 'player');
    });
    while (s.rivals.length < 2) addRival(n);
    if (s.rivals.length < 4 && U.chance(0.03)) addRival(n);
  }
  function C(k) { return G.character.standing(k); }

  // Strongest rival matters in elections.
  function electionPenalty(n) {
    var top = (S().rivals || []).filter(function (r) { return r.role === 'opposition' && r.nation === n.id; }).sort(function (a, b) { return b.power - a.power; })[0];
    return top ? (top.power - 40) * 0.02 : 0;
  }

  // ---------- your moves ----------
  function candidates(post) {
    var s = S(), n = E().pn(), key = post + ':' + s.year;
    s.candidates = s.candidates || {};
    if (!s.candidates[key]) s.candidates[key] = [minister(n, post), minister(n, post), minister(n, post)];
    return s.candidates[key];
  }
  function appoint(post, candId) {
    var s = S(), c = candidates(post).filter(function (x) { return String(x.id) === String(candId); })[0];
    if (!c || !s.cabinet) return null;
    var old = s.cabinet[post];
    c.since = s.year; s.cabinet[post] = c;
    if (old && (has(old, 'ambitious') || old.loyalty < 40)) {
      addRival(E().pn(), 'exminister', Object.assign({}, old, { power: 25 + stars(old) * 5, hostility: 60 }));
      return old.name + ' is out, and bitter about it: they join your rivals.';
    }
    return c.name + ' is the new Minister of ' + POSTS[post].name + '.';
  }

  G.events.defs.push({ id: 'minister-scandal', w: 0, cond: function () { return false; },
    title: 'Scandal: Minister {mname}',
    text: 'Journalists have proof that {mname}, your Minister of {postName}, has been stealing from the treasury.',
    choices: [
      { t: 'Fire them at once', r: function (c) { var s = S(); if (s.cabinet && s.cabinet[c.post] && s.cabinet[c.post].id === c.mid) s.cabinet[c.post] = minister(E().pn(), c.post); P().popularity = U.clamp(P().popularity + 3, 0, 100); return 'You act decisively. The public approves.'; } },
      { t: 'Protect them', r: function () { P().popularity = U.clamp(P().popularity - 8, 0, 100); E().addMod(E().pn(), 'approval', -4, 2); return 'You stand by your minister. The scandal drags on for months.'; } }
    ] });

  return { POSTS: POSTS, POST_IDS: POST_IDS, TRAITS: TRAITS, RIVAL_ROLES: RIVAL_ROLES, init: init, ensure: ensure, year: year, fx: fx, stars: stars, has: has,
    candidates: candidates, appoint: appoint, rival: rival, addRival: addRival, electionPenalty: electionPenalty, newCabinet: newCabinet };
})();
