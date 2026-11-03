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
      var CO = G.colony; CO.ensure(c);
      var sp = CO.SPECS[c.spec];
      return '<div class="action"><div class="row"><div class="name">' + b.icon + ' ' + esc(c.name) + '</div><span class="tag">' + SP.LEVELS[c.level - 1] + '</span></div>' +
        '<div class="desc">' + esc(b.name) + ' · ' + U.people(c.pop) + ' people · ' + sp.icon + ' ' + sp.name + (CO.blockaded(c) ? ' · <span class="bad">blockaded</span>' : '') + '</div>' +
        '<div class="small muted" style="margin:-4px 0 6px">' + outputLine(c) + '</div>' +
        '<div class="row small"><span>Self-rule movement</span><span class="' + (c.autonomy >= 70 ? 'bad' : c.autonomy >= 40 ? 'warn' : '') + '">' + Math.round(c.autonomy) + '%</span></div>' + bar(c.autonomy, c.autonomy >= 70 ? 'bad' : c.autonomy >= 40 ? 'warn' : 'good') +
        (lead && c.level < SP.LEVELS.length ? '<button class="btn sm ' + (can ? 'blue' : '') + '" data-act="colexpand" data-arg="' + c.id + '" ' + (can ? '' : 'disabled') + '>' +
          (can ? 'Expand to ' + SP.LEVELS[c.level].toLowerCase() + ' · ' + U.money(cost) : 'Can expand in ' + Math.max(1, 5 - (s.year - c.grew)) + ' yr') + '</button> ' : '') +
        '<button class="btn sm" data-act="colony" data-arg="' + c.id + '">Manage</button></div>';
    }).join('') : '<div class="small muted">No colonies yet. ' + (mi >= 2 ? 'Tap the Moon on the map to found one.' : 'Reach Lunar Colony (space milestone) to found your first colony.') + '</div>') +
      '<div class="small muted" style="margin-top:6px">Colonies add space progress, research and growth, and each one specialises: mining, science, shipyards, habitats or culture. Tap Manage to choose its role, build, appoint a governor and set how much self-rule it gets. In wars, colonies can be blockaded and stormed.</div></div>';

    // Space race milestones
    h += '<div class="card"><h3>The space race</h3>';
    ms.forEach(function (m, i) {
      var f = s.firsts[i];
      h += '<div class="ms ' + (i <= mi ? 'done' : i === mi + 1 ? 'next' : '') + '"><div class="n">' + (i <= mi ? '✓' : i) + '</div><div>' +
        '<div><b>' + m.name + '</b> <span class="small muted">' + U.num(m.points) + ' pts</span></div>' +
        '<div class="small muted">' + esc(m.desc) + '</div>' +
        (function () { var bs = SP.BODIES.filter(function (b) { return b.unlock === i; }); return bs.length ? '<div class="small good">🏗️ Unlocks colonies on ' + bs.map(function (b) { return b.icon + ' ' + esc(b.name); }).join(', ') + '</div>' : ''; })() +
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

  // A short summary of what a colony gives each year.
  function outputLine(c) {
    var o = G.colony.produce(c), n = E.nation(c.nation), parts = [];
    if (o.income > 0) parts.push('+' + U.money(o.income) + '/yr');
    if (o.rp > 0.5) parts.push('+' + Math.round(o.rp) + ' RP');
    if (o.space > 0.05) parts.push('+' + o.space.toFixed(1) + ' space');
    if (o.eq > 0) parts.push('+' + U.money(o.eq) + ' warships');
    if (o.approval > 0.05) parts.push('+' + o.approval.toFixed(1) + ' approval');
    if (c.spec === 'habitat') parts.push('faster growth, calmer colonists');
    return parts.join(' · ');
  }

  // ---------- colony management ----------
  function colonyModal(cid) {
    var CO = G.colony, c = SP.list().filter(function (x) { return String(x.id) === String(cid); })[0];
    if (!c) return;
    CO.ensure(c);
    var n = E.pn(), lead = E.isLeader() && c.nation === n.id, b = SP.body(c.body), y = S().year;
    var h = '<div class="kicker">' + b.icon + ' ' + esc(b.name) + ' · ' + SP.LEVELS[c.level - 1] + '</div><h2>' + esc(c.name) + '</h2>' +
      '<div class="grid2">' + stat('People', U.people(c.pop)) + stat('Founded', c.founded) +
      stat('Self-rule movement', '<span class="' + (c.autonomy >= 70 ? 'bad' : c.autonomy >= 40 ? 'warn' : '') + '">' + Math.round(c.autonomy) + '%</span>') +
      stat('Defence', U.money(CO.defence(c))) + '</div>' +
      (CO.blockaded(c) ? '<p class="small bad" style="margin-top:8px">Blockaded by an enemy fleet: output halved.</p>' : '') +
      '<p class="small" style="margin-top:8px"><b>Each year:</b> ' + (outputLine(c) || 'nothing yet') + '</p>';

    // Specialisation
    var locked = (c.specSince || 0) + 10 > y;
    h += '<h3 style="margin-top:14px">Specialisation</h3>' + CO.SPEC_KEYS.map(function (k) {
      var sp = CO.SPECS[k], su = CO.suit(c, k), sel = c.spec === k;
      var fit = su >= 1.4 ? '<span class="good">excellent here</span>' : su >= 1.1 ? '<span class="good">good here</span>' : su >= 0.9 ? '<span class="muted">average here</span>' : '<span class="bad">poor here</span>';
      return '<button class="choice ' + (sel ? 'sel' : '') + '" ' + (lead && !sel && !locked ? 'data-act="colspec" data-arg="' + c.id + '|' + k + '"' : 'disabled') + '>' +
        '<div class="row"><div class="t">' + sp.icon + ' ' + sp.name + '</div><span class="small">' + fit + '</span></div><div class="d">' + sp.desc + '</div></button>';
    }).join('') + (lead && locked ? '<div class="small muted">Can change role again in ' + ((c.specSince || 0) + 10 - y) + ' years.</div>' : '');

    // Buildings
    h += '<h3 style="margin-top:14px">Buildings <span class="small" style="text-transform:none;letter-spacing:0">· ' + c.bld.length + ' / ' + CO.slots(c) + ' slots (one per level)</span></h3>' +
      Object.keys(CO.BUILDINGS).map(function (k) {
        var B = CO.BUILDINGS[k], built = CO.has(c, k);
        if (!built && B.bodies && B.bodies.indexOf(c.body) < 0) return '';
        var can = lead && CO.canBuild(c, k), cost = CO.buildCost(n, k);
        var why = built ? '<span class="good">Built</span>' : c.level < (B.minLevel || 1) ? '<span class="muted">Needs ' + SP.LEVELS[B.minLevel - 1].toLowerCase() + '</span>' : c.bld.length >= CO.slots(c) ? '<span class="muted">No free slot</span>' : '';
        return '<div class="action"><div class="row"><div class="name">' + esc(B.name) + '</div><div class="cost">' + (built ? '' : U.money(cost)) + '</div></div><div class="desc">' + esc(B.desc) + '</div>' +
          (why ? '<div class="small">' + why + '</div>' : lead ? '<button class="btn sm ' + (can ? 'blue' : '') + '" data-act="colbuild" data-arg="' + c.id + '|' + k + '" ' + (can ? '' : 'disabled') + '>Build</button>' : '') + '</div>';
      }).join('');

    // Governor
    var tr = c.gov ? CO.TRAITS[c.gov.trait] : null, govLocked = (c.govSince || 0) + 5 > y;
    h += '<h3 style="margin-top:14px">Governor</h3>' +
      (c.gov ? '<div class="row"><b>' + esc(c.gov.name) + '</b><span class="tag">' + tr.name + '</span></div><div class="small muted">' + tr.desc + '</div>' : '') +
      (lead ? (govLocked ? '<div class="small muted" style="margin-top:6px">Can be replaced in ' + ((c.govSince || 0) + 5 - y) + ' years.</div>' :
        '<div class="small muted" style="margin:8px 0 4px">Candidates</div>' + CO.candidates(c).map(function (g, i) {
          return '<button class="choice" data-act="colgov" data-arg="' + c.id + '|' + i + '"><div class="row"><div class="t">' + esc(g.name) + '</div><span class="tag">' + CO.TRAITS[g.trait].name + '</span></div><div class="d">' + CO.TRAITS[g.trait].desc + '</div></button>';
        }).join('')) : '');

    // Self-rule
    var ruleLocked = (c.ruleSince || 0) + 5 > y;
    h += '<h3 style="margin-top:14px">Self-rule</h3><div class="seg">' + Object.keys(CO.RULES).map(function (r) {
      return '<button class="' + (c.rule === r ? 'sel' : '') + '" ' + (lead && c.rule !== r && !ruleLocked ? 'data-act="colrule" data-arg="' + c.id + '|' + r + '"' : 'disabled') + '>' + CO.RULES[r].name + '</button>';
    }).join('') + '</div><div class="small muted" style="margin-top:6px">' + CO.RULES[c.rule].desc + (lead && ruleLocked ? ' Can change again in ' + ((c.ruleSince || 0) + 5 - y) + ' years.' : '') + '</div>';

    if (lead && SP.canExpand(c)) h += '<button class="btn blue" data-act="colexpand" data-arg="' + c.id + '">Expand to ' + SP.LEVELS[c.level].toLowerCase() + ' · ' + U.money(SP.expandCost(n, c)) + '</button>';
    modal(h + '<button class="btn" data-act="close">Close</button>');
  }
  on('colony', function (cid) { colonyModal(cid); });
  function colAct(fn, msg) {
    return function (arg) {
      var p = arg.split('|'), c = SP.list().filter(function (x) { return String(x.id) === p[0]; })[0];
      if (!c || c.nation !== E.pn().id || !E.isLeader()) return;
      if (fn(c, p[1])) { E.save(); toast(msg(c, p[1])); }
      var y = window.scrollY; render(); window.scrollTo(0, y); colonyModal(c.id);
    };
  }
  on('colspec', colAct(function (c, k) { return G.colony.setSpec(c, k); }, function (c, k) { return c.name + ' becomes a ' + G.colony.SPECS[k].name.toLowerCase() + ' colony.'; }));
  on('colbuild', colAct(function (c, k) { return G.colony.build(c, k); }, function (c, k) { return G.colony.BUILDINGS[k].name + ' built on ' + c.name + '.'; }));
  on('colgov', colAct(function (c, i) { return G.colony.appoint(c, +i); }, function (c) { return c.gov.name + ' is the new governor of ' + c.name + '.'; }));
  on('colrule', colAct(function (c, r) { return G.colony.setRule(c, r); }, function (c, r) { return c.name + ' now has ' + G.colony.RULES[r].name.toLowerCase() + '.'; }));

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
