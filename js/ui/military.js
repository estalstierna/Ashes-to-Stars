// Military tab: forces, conscription, branches, projects, occupation and alliances.
(function () {
  var K = G.uiKit, U = G.util, E = G.engine, D = G.data, A = G.actions, EV = G.events, M = G.military;
  var $ = K.$, S = K.S, esc = K.esc, modal = K.modal, closeModal = K.closeModal, toast = K.toast, bar = K.bar, stat = K.stat,
    rankStr = K.rankStr, wealthStr = K.wealthStr, on = K.on, keepScroll = K.keepScroll, signedMoney = K.signedMoney, pctS = K.pctS,
    SECTOR_LABELS = K.SECTOR_LABELS, PACT_NAMES = K.PACT_NAMES, showResult = K.showResult;
  function render() { K.render(); }
  function resumePending() { K.resumePending(); }

  // ---------- military ----------
  function menStr(k) { return U.num(k * 1000); }

  function militaryTab() {
    var n = E.pn(), p = S().player, lead = E.isLeader(), m = n.mil, f = E.funds(n);
    var pers = M.personnelCost(n), invest = f.mil - pers;
    var h = '';
    // Overview
    h += '<div class="card"><div class="row"><h2>🎖️ Armed Forces</h2><span class="tag">#' + E.rank(n, E.power) + ' in the world</span></div>' +
      '<div class="grid2" style="margin-top:8px">' +
      stat('Military power', U.num(E.power(n))) +
      stat('Manpower', menStr(m.men) + ' <span class="small muted">soldiers</span>') +
      stat('Equipment stock', U.money(M.equipment(n))) +
      stat('Quality', '×' + M.quality(n).toFixed(2)) +
      stat('Military budget', U.money(f.mil) + '<span class="small muted">/yr</span>') +
      stat('Soldier salaries', '<span class="' + (invest < 0 ? 'bad' : '') + '">' + U.money(pers) + '</span><span class="small muted">/yr</span>') +
      '</div>' +
      // Where the yearly military budget goes.
      '<div style="margin-top:10px">' +
      '<div class="delta"><span>Military budget</span><span>' + U.money(f.mil) + '/yr</span></div>' +
      '<div class="delta"><span>− Soldier salaries</span><span class="bad">−' + U.money(pers) + '/yr</span></div>' +
      '<div class="delta" style="font-weight:700"><span>= New equipment</span><span class="' + (invest < 0 ? 'bad' : 'good') + '">' + U.money(Math.max(0, invest)) + '/yr</span></div></div>' +
      '<div class="small muted" style="margin-top:6px">' +
      (invest < 0 ? '<span class="bad">⚠️ The budget does not even cover salaries, so equipment is rotting.</span> ' : '') +
      'The <b>equipment stock</b> is everything bought over the years. About 8% of it wears out every year, so the stock is much larger than one year\'s budget. Power = √(equipment × manpower) × quality.</div>' +
      (p.role === 'general' ? '<div class="row small" style="margin-top:8px"><span>Troop loyalty to you</span><b>' + Math.round(p.influence) + '</b></div>' + bar(p.influence, 'warn') : '') +
      (!lead ? '<div class="small warn" style="margin-top:8px">You are viewing in read-only mode. Only the head of state commands the military.</div>' : '') +
      '</div>';

    // Conscription
    var target = M.targetMen(n);
    h += '<div class="card"><h3>Conscription</h3>' +
      '<div class="row"><span>Rate <b id="cv">' + (m.consc * 100).toFixed(1) + '%</b> of population</span><span id="ct">' + menStr(target) + ' target</span></div>' +
      (lead ? '<input type="range" min="0.2" max="10" step="0.1" value="' + (m.consc * 100).toFixed(1) + '" data-input="consc">' : bar(m.consc * 1000, '')) +
      '<div id="consc-fx">' + conscEffects(n) + '</div></div>';

    // Branches
    var sh = M.shares(n), newEq = Math.max(0, invest);
    h += '<div class="card"><h3>Branches</h3><div class="small muted" style="margin-bottom:8px">How the yearly equipment money (' + U.money(newEq) + '/yr) is split. <b>Stock</b> is the equipment each branch already has.</div>';
    M.BRANCHES.forEach(function (b) {
      var info = M.BRANCH_INFO[b], locked = b === 'space' && !M.hasSpace(n);
      var bonus = m.bonus[b] ? ' <span class="good small">+' + Math.round(m.bonus[b] * 100) + '%</span>' : '';
      h += '<div class="slider-row" style="margin-bottom:12px"><div class="row"><span>' + info.icon + ' <b>' + info.name + '</b>' + bonus + '</span>' +
        '<span>' + (locked ? '<span class="muted small">🔒 locked</span>' : '<b id="bs-' + b + '">' + Math.round(sh[b] * 100) + '%</b> · <span id="bb-' + b + '">' + U.money(newEq * sh[b]) + '</span>/yr') + '</span></div>' +
        (locked ? '' : '<div class="row small muted"><span></span><span>Stock: ' + U.money(m.eq[b]) + '</span></div>') +
        (lead && !locked ? '<input type="range" min="0" max="100" value="' + m.alloc[b] + '" data-input="branch" data-k="' + b + '">' : '') +
        '<div class="small muted">' + info.role + '</div></div>';
    });
    h += '</div>';

    // Projects
    var active = m.active, sl = M.slots(n);
    h += '<div class="card"><div class="row"><h3>Military projects</h3><span class="tag">' + active.length + '/' + sl + ' slots</span></div>' +
      '<div class="small muted" style="margin-bottom:8px">Multi-year projects. The yearly cost is added to the national budget. Finished projects give permanent bonuses and unlock new projects. Starting one does not use an action.</div>';
    if (active.length) {
      h += '<div class="small" style="font-weight:700;margin:6px 0">In progress</div>';
      active.forEach(function (a) {
        var pr = M.project(a.id);
        h += '<div class="action"><div class="row"><div class="name">' + pr.icon + ' ' + esc(pr.name) + '</div><div class="cost">' + U.money(pr.cost * n.gdp) + '/yr</div></div>' +
          '<div class="desc">' + esc(pr.desc) + '</div>' +
          '<div class="row small"><span>Year ' + a.progress + ' of ' + pr.years + '</span><span>' + (pr.years - a.progress) + ' year(s) left</span></div>' + bar(a.progress / pr.years * 100, '') +
          (lead ? '<button class="btn sm danger" data-act="cancelproj" data-arg="' + pr.id + '">Cancel</button>' : '') + '</div>';
      });
    }
    var avail = M.PROJECTS.filter(function (pr) { return M.projectState(n, pr) === 'available'; });
    if (avail.length) {
      h += '<div class="small" style="font-weight:700;margin:10px 0 6px">Available</div>';
      avail.forEach(function (pr) {
        var can = lead && active.length < sl;
        h += '<div class="action"><div class="row"><div class="name">' + pr.icon + ' ' + esc(pr.name) + '</div><div class="cost">' + U.money(pr.cost * n.gdp) + '/yr</div></div>' +
          '<div class="desc">' + esc(pr.desc) + '</div>' +
          '<div class="small muted" style="margin-bottom:8px">' + pr.years + ' years · total ≈ ' + U.money(pr.cost * n.gdp * pr.years) + '</div>' +
          (lead ? '<button class="btn sm ' + (can ? 'blue' : '') + '" data-act="startproj" data-arg="' + pr.id + '" ' + (can ? '' : 'disabled') + '>' + (can ? 'Start project' : 'No free slot') + '</button>' : '') + '</div>';
      });
    }
    var locked = M.PROJECTS.filter(function (pr) { return M.projectState(n, pr) === 'locked'; });
    if (locked.length) {
      h += '<div class="small" style="font-weight:700;margin:10px 0 6px">Locked</div>';
      locked.forEach(function (pr) {
        h += '<div class="row small" style="padding:6px 0;border-bottom:1px solid #1a2230"><span>🔒 ' + esc(pr.name) + '</span><span class="muted" style="text-align:right">needs ' + esc(M.lockReason(n, pr)) + '</span></div>';
      });
    }
    if (m.done.length) {
      h += '<div class="small" style="font-weight:700;margin:12px 0 6px">Completed</div>' +
        m.done.map(function (id) { var pr = M.project(id); return '<span class="tag pact" style="margin-bottom:4px">' + pr.icon + ' ' + esc(pr.name) + '</span>'; }).join(' ');
    }
    h += '</div>';

    // Occupied territories
    var occ = E.occupiedBy(n);
    if (occ.length) {
      h += '<div class="card"><h3>Occupied territories</h3>' +
        '<div class="small muted" style="margin-bottom:8px">Conquered peoples resist. High unrest leads to regional uprisings and wars of independence. Stable rule over decades integrates them for good.</div>';
      occ.forEach(function (d) {
        var o = E.occupation(d);
        h += '<div style="margin-bottom:10px"><div class="row small"><b><span class="dot" style="background:' + d.color + '"></span>' + esc(d.name) + '</b><span class="muted">held since ' + o.since + '</span></div>' +
          '<div class="row small"><span>Unrest</span><span class="' + (o.unrest >= 70 ? 'bad' : o.unrest >= 50 ? 'warn' : '') + '">' + Math.round(o.unrest) + (o.unrest >= 70 ? ' · uprising risk!' : '') + '</span></div>' + bar(o.unrest, o.unrest >= 70 ? 'bad' : o.unrest >= 50 ? 'warn' : 'good') +
          '<div class="row small"><span>Integration</span><span>' + Math.round(o.integ) + '%</span></div>' + bar(o.integ, '') + '</div>';
      });
      h += '<div class="small muted">Tip: keep your stability high, use "Pacify occupied lands" or "Grant regional autonomy" (Actions → Politics).</div></div>';
    }

    // Alliances
    var al = E.allies(n);
    h += '<div class="card"><h3>Alliances</h3>' +
      (al.length ? al.map(function (x) {
        return '<div class="row small" style="padding:4px 0"><span>' + PACT_NAMES[E.allianceType(n, x)] + ' · <span class="dot" style="background:' + x.color + '"></span>' + esc(x.short) + '</span><span>power ' + U.num(E.power(x)) + '</span></div>';
      }).join('') + '<div class="small muted" style="margin-top:6px">Partners decide case by case whether to fight: see World → Diplomacy for their odds. Combined defensive strength: ' + U.num(E.blocPower(n)) + '.</div>' :
        '<div class="small muted">No allies. ' + (lead ? 'Propose an alliance from the Actions tab or by tapping a nation on the World map.' : '') + '</div>') + '</div>';

    // Wars
    var wars = E.warsOf(n);
    if (wars.length) {
      h += '<div class="card"><h3>Wars</h3>' + wars.map(function (w) {
        var enemy = E.nation(w.a === n.id ? w.b : w.a), sc = w.a === n.id ? w.score : -w.score;
        var goal = G.war.GOALS[w.goal || 'conquer'], mine = G.war.occupiedBy(w, n).length, theirs = G.war.occupiedBy(w, enemy).length;
        var label = w.independence ? (w.a === n.id ? 'Your war of independence' : 'Uprising') : (w.a === n.id ? goal.icon + ' ' + goal.name : 'Defending');
        return '<div style="padding:6px 0;border-bottom:1px solid #1a2230"><div class="row small"><span>⚔️ vs <b>' + esc(enemy.short) + '</b> · ' + esc(label) + '</span><b class="' + (sc >= 0 ? 'good' : 'bad') + '">' + Math.round(sc) + '</b></div>' +
          bar(50 + sc / 2, sc >= 0 ? 'good' : 'bad') +
          '<div class="row small muted"><span>You occupy ' + mine + ' provinces · they occupy ' + theirs + '</span><span>power ' + U.num(E.power(enemy)) + '</span></div>' +
          (lead ? '<div class="row" style="gap:6px;margin-top:6px"><button class="btn sm" data-act="target" data-arg="offensive|' + enemy.id + '">Offensive</button>' +
            '<button class="btn sm blue" data-act="target" data-arg="peace|' + enemy.id + '">Negotiate peace</button></div>' : '') + '</div>';
      }).join('') + '<div class="small muted" style="margin-top:6px">War score: ±100 decides the war. The front line moves with it: occupied provinces show striped on the map.</div></div>';
    }

    // Ranking
    h += '<div class="card"><h3>World military ranking</h3>';
    E.alive().slice().sort(function (a, b) { return E.power(b) - E.power(a); }).slice(0, 8).forEach(function (x, i) {
      h += '<div class="row small" style="padding:4px 0"><span>' + (i + 1) + '. <span class="dot" style="background:' + x.color + '"></span>' + esc(x.short) + (x === n ? ' (you)' : '') + '</span>' +
        '<span>' + U.num(E.power(x)) + ' <span class="muted">· ' + menStr(x.mil.men) + ' men</span></span></div>';
    });
    return h + '</div>';
  }

  function conscEffects(n) {
    var g = M.conscGrowthPenalty(n), a = M.conscApprovalPenalty(n), sal = M.targetMen(n) * (n.gdp / n.pop) * 0.4 / 1000;
    return '<div class="small" style="margin-top:6px">' +
      '<div class="row"><span class="muted">Salaries at target</span><span>' + U.money(sal) + '/yr</span></div>' +
      '<div class="row"><span class="muted">Economy (lost workforce)</span><span class="' + (g > 0 ? 'bad' : 'good') + '">' + (g > 0 ? '−' + (g * 100).toFixed(1) + '% growth' : 'no effect') + '</span></div>' +
      '<div class="row"><span class="muted">Public approval</span><span class="' + (a > 0 ? 'bad' : 'good') + '">' + (a > 0 ? '−' + a.toFixed(0) : 'no effect') + (a > 0 && E.atWar(n) ? ' (halved in wartime)' : '') + '</span></div>' +
      '<div class="muted" style="margin-top:4px">Up to 1% is free. Above that, conscription hurts the economy and the public mood. Soldiers are recruited gradually over a few years.</div></div>';
  }
  on('consc', function (v) {
    var n = E.pn(); n.mil.consc = +v / 100;
    $('cv').textContent = (+v).toFixed(1) + '%';
    $('ct').textContent = menStr(M.targetMen(n)) + ' target';
    $('consc-fx').innerHTML = conscEffects(n);
    E.save();
  });
  on('branch', function (v, el) {
    var n = E.pn(); n.mil.alloc[el.getAttribute('data-k')] = +v;
    var sh = M.shares(n), newEq = Math.max(0, E.funds(n).mil - M.personnelCost(n));
    M.BRANCHES.forEach(function (b) {
      var x = $('bs-' + b); if (x) x.textContent = Math.round(sh[b] * 100) + '%';
      var y = $('bb-' + b); if (y) y.textContent = U.money(newEq * sh[b]);
    });
    E.save();
  });
  on('startproj', function (id) {
    var n = E.pn();
    if (M.startProject(n, id)) { E.save(); keepScroll(render); toast(M.project(id).name + ' started.'); }
  });
  on('cancelproj', function (id) {
    if (!confirm('Cancel this project? Money already spent is lost.')) return;
    M.cancelProject(E.pn(), id); E.save(); keepScroll(render);
  });


  K.tabs.mil = { render: militaryTab };
})();
