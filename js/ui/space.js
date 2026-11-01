// Space tab: a map of the solar system, body details (with the Moon's story), colonies and the space race.
(function () {
  var K = G.uiKit, U = G.util, E = G.engine, D = G.data, SP = G.space;
  var $ = K.$, S = K.S, esc = K.esc, modal = K.modal, closeModal = K.closeModal, toast = K.toast, bar = K.bar, stat = K.stat,
    on = K.on, keepScroll = K.keepScroll;
  function render() { K.render(); }

  // Positions on the system map (viewBox 600 x 320). The Sun sits just off the left edge.
  var POS = {
    mercury: [70, 190], venus: [110, 120], earth: [165, 205], moon: [192, 182], mars: [225, 110],
    ceres: [300, 220], europa: [372, 112], ganymede: [402, 150], titan: [478, 215], proxima: [545, 80]
  };
  var ORBITS = [60, 100, 150, 205, 290, 390, 490];

  function systemMap() {
    var n = E.pn(), h = '<div class="sys-wrap"><svg id="sys-map" viewBox="0 0 600 320" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><radialGradient id="sun" cx="0" cy="0.5" r="1"><stop offset="0" stop-color="#fff3b0"/><stop offset="0.4" stop-color="#ffb347"/><stop offset="1" stop-color="#ff7b00" stop-opacity="0"/></radialGradient></defs>' +
      '<rect width="600" height="320" fill="#05080f"/>';
    // stars
    for (var i = 0; i < 60; i++) h += '<circle cx="' + ((i * 97) % 600) + '" cy="' + ((i * 53) % 320) + '" r="' + (i % 3 === 0 ? 1 : 0.6) + '" fill="#cfd8e6" opacity="' + (0.3 + (i % 5) / 10) + '"/>';
    h += '<circle cx="-40" cy="160" r="110" fill="url(#sun)"/><circle cx="-40" cy="160" r="42" fill="#ffd166"/>';
    ORBITS.forEach(function (r) { h += '<circle cx="-40" cy="160" r="' + r + '" fill="none" stroke="#1f2a3d" stroke-width="1"/>'; });
    // Earth (home)
    h += '<circle cx="' + POS.earth[0] + '" cy="' + POS.earth[1] + '" r="9" fill="#3d8bff" stroke="#9cc6ff" stroke-width="1"/>' +
      '<text x="' + POS.earth[0] + '" y="' + (POS.earth[1] + 22) + '" class="sys-label">Earth</text>' +
      '<circle cx="' + POS.earth[0] + '" cy="' + POS.earth[1] + '" r="32" fill="none" stroke="#1f2a3d" stroke-dasharray="2 3"/>';
    // Proxima: off the map
    h += '<text x="592" y="30" class="sys-label" style="text-anchor:end">→ 4.24 light-years</text>';
    SP.BODIES.forEach(function (b) {
      var p = POS[b.id], open = SP.unlocked(n, b), cols = SP.on(b.id);
      var r = b.id === 'moon' ? 5 : b.id === 'ceres' ? 4 : 7;
      h += '<g class="sys-body" data-body="' + b.id + '">' +
        '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="16" fill="transparent"/>' + // bigger tap target
        '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + r + '" fill="' + bodyColor(b.id) + '" opacity="' + (open ? 1 : 0.35) + '"/>' +
        '<text x="' + p[0] + '" y="' + (p[1] - r - 11) + '" class="sys-label' + (open ? '' : ' locked') + '">' + (open ? '' : '🔒 ') + esc(b.name.replace(' & the Belt', '').replace(' (cloud cities)', '')) + '</text>';
      cols.forEach(function (c, k) {
        var o = c.nation ? E.nation(c.nation) : null;
        var ang = (k / Math.max(1, cols.length)) * Math.PI * 2 - Math.PI / 2, rr = r + 6;
        h += '<circle cx="' + (p[0] + Math.cos(ang) * rr) + '" cy="' + (p[1] + Math.sin(ang) * rr) + '" r="' + (1.5 + c.level * 0.5) + '" fill="' + (o ? o.color : '#ffffff') + '" stroke="#05080f" stroke-width="0.8"/>';
      });
      h += '</g>';
    });
    return h + '</svg></div><div class="small muted" style="margin:6px 0 12px">Tap a world for its story and colonies. Coloured dots are colonies (white = independent). 🔒 worlds unlock with space milestones.</div>';
  }
  function bodyColor(id) {
    return { moon: '#d8d8d8', mars: '#d4553b', ceres: '#8d8d8d', europa: '#cfe3f5', ganymede: '#a7a093', titan: '#e3a03b', venus: '#f2d48c', mercury: '#9e9e9e', proxima: '#5fbf8f' }[id];
  }

  function spaceTab() {
    var n = E.pn(), lead = E.isLeader(), s = S();
    var mi = E.milestoneIndex(n), ms = D.milestones, next = ms[mi + 1];
    var h = '<div class="card"><div class="row"><h2>🚀 Space</h2><span class="tag">#' + E.rank(n, function (x) { return x.space; }) + ' in the space race</span></div>' +
      '<div class="grid2" style="margin-top:8px">' +
      stat('Space programme', esc(ms[mi].name)) +
      stat('Progress', U.num(n.space) + ' pts <span class="small muted">+' + U.num(E.spaceRate(n)) + '/yr</span>') +
      stat('Colonies', SP.of(n).length) +
      stat('People in space', U.people(SP.of(n).reduce(function (a, c) { return a + c.pop; }, 0))) + '</div>' +
      (next ? '<div style="margin-top:8px"><div class="row small"><span>Next: <b>' + esc(next.name) + '</b></span><span>' + U.num(n.space) + ' / ' + U.num(next.points) + '</span></div>' +
        bar((n.space - ms[mi].points) / (next.points - ms[mi].points) * 100, '') + '</div>' : '') + '</div>';

    h += '<h3>The solar system</h3>' + systemMap();

    // Your colonies
    var mine = SP.of(n);
    h += '<div class="card"><h3>Your colonies</h3>' + (mine.length ? mine.map(function (c) {
      var b = SP.body(c.body), can = lead && SP.canExpand(c), cost = SP.expandCost(n, c);
      return '<div class="action"><div class="row"><div class="name">' + b.icon + ' ' + esc(c.name) + '</div><span class="tag">' + SP.LEVELS[c.level - 1] + '</span></div>' +
        '<div class="desc">' + esc(b.name) + ' · ' + U.people(c.pop) + ' people · founded ' + c.founded + '</div>' +
        '<div class="row small"><span>Self-rule movement</span><span class="' + (c.autonomy >= 70 ? 'bad' : c.autonomy >= 40 ? 'warn' : '') + '">' + Math.round(c.autonomy) + '%</span></div>' + bar(c.autonomy, c.autonomy >= 70 ? 'bad' : c.autonomy >= 40 ? 'warn' : 'good') +
        (lead && c.level < SP.LEVELS.length ? '<button class="btn sm ' + (can ? 'blue' : '') + '" data-act="colexpand" data-arg="' + c.id + '" ' + (can ? '' : 'disabled') + '>' +
          (can ? 'Expand to ' + SP.LEVELS[c.level].toLowerCase() + ' · ' + U.money(cost) : 'Can expand in ' + Math.max(1, 5 - (s.year - c.grew)) + ' yr') + '</button>' : '') + '</div>';
    }).join('') : '<div class="small muted">No colonies yet. ' + (mi >= 1 ? 'Tap the Moon on the map to found one.' : 'Reach a Lunar Outpost (space milestone) to found your first colony.') + '</div>') +
      '<div class="small muted" style="margin-top:6px">Colonies add space progress, research points and economic growth every year. Big, distant colonies drift towards independence; a stable homeland slows that down.</div></div>';

    // Space race milestones
    h += '<div class="card"><h3>The space race</h3>';
    ms.forEach(function (m, i) {
      var f = s.firsts[i];
      h += '<div class="ms ' + (i <= mi ? 'done' : i === mi + 1 ? 'next' : '') + '"><div class="n">' + (i <= mi ? '✓' : i) + '</div><div>' +
        '<div><b>' + m.name + '</b> <span class="small muted">' + U.num(m.points) + ' pts</span></div>' +
        '<div class="small muted">' + esc(m.desc) + '</div>' +
        (f ? '<div class="small warn">First: ' + esc(E.nation(f.nation).short) + ' (' + f.year + ')</div>' : '') + '</div></div>';
    });
    h += '</div><div class="card"><h3>Leaderboard</h3>';
    E.alive().slice().sort(function (a, b) { return b.space - a.space; }).slice(0, 8).forEach(function (x) {
      h += '<div class="row small" style="padding:4px 0"><span><span class="dot" style="background:' + x.color + '"></span>' + esc(x.short) + (x === n ? ' (you)' : '') + '</span><span>' + U.num(x.space) + ' pts · ' + SP.of(x).length + ' colonies</span></div>';
    });
    return h + '</div>';
  }

  function bodyModal(id) {
    var b = SP.body(id), n = E.pn(), lead = E.isLeader(), open = SP.unlocked(n, b), cols = SP.on(id);
    var mine = cols.filter(function (c) { return c.nation === n.id; })[0];
    var h = '<div class="kicker">' + esc(b.distance) + '</div><h2>' + b.icon + ' ' + esc(b.name) + '</h2>' +
      '<div class="grid2" style="margin:8px 0">' + stat('Gravity', b.gravity) + stat('Day length', b.day) + stat('Temperature', b.temp) +
      stat('Unlocks at', esc(D.milestones[b.unlock].name)) + '</div>' +
      '<p class="small"><b>Resources:</b> ' + esc(b.resources) + '</p>' +
      b.lore.map(function (l) { return '<p class="small muted">' + esc(l) + '</p>'; }).join('') +
      '<h3 style="margin-top:12px">Settlements</h3>' + (cols.length ? cols.map(function (c) {
        var o = c.nation ? E.nation(c.nation) : null;
        return '<div class="row small" style="padding:4px 0"><span><span class="dot" style="background:' + (o ? o.color : '#fff') + '"></span>' + esc(c.name) + '</span>' +
          '<span class="muted">' + (o ? esc(o.short) : 'Independent') + ' · ' + SP.LEVELS[c.level - 1] + ' · ' + U.people(c.pop) + '</span></div>';
      }).join('') : '<div class="small muted">Nobody lives here yet.</div>');
    if (lead) {
      if (!open) h += '<div class="small warn" style="margin-top:10px">🔒 Reach the space milestone "' + esc(D.milestones[b.unlock].name) + '" to settle here.</div>';
      else if (!mine) {
        var cost = SP.foundCost(n, b), afford = n.treasury - cost >= -E.borrowLimit(n);
        h += '<button class="btn blue" data-act="colfound" data-arg="' + id + '" ' + (afford ? '' : 'disabled') + '>Found a colony · ' + U.money(cost) + '</button>';
      } else if (SP.canExpand(mine)) {
        h += '<button class="btn blue" data-act="colexpand" data-arg="' + mine.id + '">Expand ' + esc(mine.name) + ' · ' + U.money(SP.expandCost(n, mine)) + '</button>';
      }
    }
    modal(h + '<button class="btn" data-act="close">Close</button>');
  }

  on('colfound', function (id) {
    var n = E.pn(), b = SP.body(id), cost = SP.foundCost(n, b);
    var c = SP.found(n, id);
    if (c) { n.treasury -= cost; E.save(); closeModal(); keepScroll(render); toast(c.name + ' founded!'); }
  });
  on('colexpand', function (cid) {
    var n = E.pn(), c = SP.list().filter(function (x) { return String(x.id) === String(cid); })[0];
    if (!c || c.nation !== n.id || !SP.canExpand(c)) return;
    n.treasury -= SP.expandCost(n, c); SP.expand(c); E.save(); closeModal(); keepScroll(render); toast(c.name + ' expanded.');
  });

  function after() {
    var svg = $('sys-map');
    if (!svg) return;
    svg.addEventListener('click', function (e) {
      var g = e.target.closest && e.target.closest('[data-body]');
      if (g) bodyModal(g.getAttribute('data-body'));
    });
  }

  K.tabs.space = { render: spaceTab, after: after };
  K.showBody = bodyModal;
})();
