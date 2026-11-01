// Home tab: your character, power base, nation overview and Earth.
(function () {
  var K = G.uiKit, U = G.util, E = G.engine, D = G.data, A = G.actions, EV = G.events, M = G.military;
  var $ = K.$, S = K.S, esc = K.esc, modal = K.modal, closeModal = K.closeModal, toast = K.toast, bar = K.bar, stat = K.stat,
    rankStr = K.rankStr, wealthStr = K.wealthStr, on = K.on, keepScroll = K.keepScroll, signedMoney = K.signedMoney, pctS = K.pctS,
    SECTOR_LABELS = K.SECTOR_LABELS, PACT_NAMES = K.PACT_NAMES, showResult = K.showResult;
  function render() { K.render(); }
  function resumePending() { K.resumePending(); }

  function homeTab() {
    var s = S(), p = s.player, n = E.pn(), g = E.gov(n);
    var ms = D.milestones, mi = E.milestoneIndex(n), next = ms[mi + 1];
    var wars = E.warsOf(n);
    var h = '';
    // Character card
    h += '<div class="card"><div class="row"><div><h2>' + esc(p.name) + '</h2>' +
      '<div class="muted small">' + D.roles[p.role].icon + ' ' + esc(E.roleTitle()) + ' · ' + esc(n.short) + '</div></div>' +
      '<div style="text-align:right"><div class="small muted">Age ' + p.age + '</div><div class="small muted">Gen. ' + p.generation + '</div></div></div>' +
      '<div style="margin-top:10px" class="grid2">' +
      '<div><div class="row small"><span>Influence</span><span>' + Math.round(p.influence) + '</span></div>' + bar(p.influence, 'warn') + '</div>' +
      '<div><div class="row small"><span>Popularity</span><span>' + Math.round(p.popularity) + '</span></div>' + bar(p.popularity, 'good') + '</div>' +
      '</div>' +
      '<div class="row small"><span class="muted">Personal wealth</span><b>' + wealthStr(p.wealth) + '</b></div>' +
      '<div class="row small"><span class="muted">Legacy</span><b>' + Math.round(p.legacy) + '</b></div>' +
      (p.candidate ? '<div class="small warn" style="margin-top:6px">🗳️ Running in the ' + (n.lastElection + 4) + ' election</div>' : '') +
      '</div>';
    h += powerBaseCard();
    // Nation card
    h += '<div class="card"><div class="row"><h2><span class="dot" style="background:' + n.color + '"></span>' + esc(n.name) + '</h2></div>' +
      '<div class="muted small" style="margin-bottom:10px">' + g.name +
      (n.leader ? ' · ' + esc(E.title(n)) + ' ' + esc(n.leader.name) + ' (' + n.leader.age + ')' : ' · Ruled by you') +
      (g.elections ? ' · Next election ' + (n.lastElection + 4) : '') + '</div>' +
      '<div class="grid2">' +
      stat('Population', U.people(n.pop)) +
      stat('GDP ' + rankStr(E.rank(n, function (x) { return x.gdp; })), U.money(n.gdp)) +
      stat('Growth', '<span class="' + ((n.growth || 0) >= 0 ? 'good' : 'bad') + '">' + U.pct(n.growth || 0) + '</span>') +
      K.treasuryStat(n) + K.balanceStat(n) +
      stat('Military ' + rankStr(E.rank(n, E.power)), U.num(E.power(n))) +
      stat('Tech ' + rankStr(E.rank(n, function (x) { return x.tech; })), n.tech.toFixed(1)) +
      stat('World\'s fear of you', '<span class="' + ((n.threat || 0) >= 45 ? 'bad' : (n.threat || 0) >= 20 ? 'warn' : 'good') + '">' + E.threatLevel(n) + '</span> <span class="small muted">' + Math.round(n.threat || 0) + '</span>') +
      stat('Difficulty', E.diff().name) +
      '</div>' +
      '<div style="margin-top:10px"><div class="row small"><span>Stability</span><span>' + Math.round(n.stability) + '</span></div>' + bar(n.stability) +
      '<div class="row small"><span>Government approval</span><span>' + Math.round(n.approval) + '</span></div>' + bar(n.approval) + '</div>' +
      '<div class="small"><span class="muted">Space:</span> ' + ms[mi].name + (next ? ' → ' + next.name + ' (' + Math.floor(n.space) + '/' + next.points + ')' : ' (max)') + '</div>' +
      (next ? bar((n.space - ms[mi].points) / (next.points - ms[mi].points) * 100, '') : '') +
      (wars.length ? '<div style="margin-top:6px">' + wars.map(function (w) {
        var enemy = E.nation(w.a === n.id ? w.b : w.a), sc = w.a === n.id ? w.score : -w.score;
        return '<div class="small"><span class="tag war">⚔️ WAR</span> vs ' + esc(enemy.name) + ': score <b class="' + (sc >= 0 ? 'good' : 'bad') + '">' + Math.round(sc) + '</b> (±100 decides)</div>';
      }).join('') + '</div>' : '<div class="small muted" style="margin-top:6px">At peace</div>') +
      '</div>';
    // Earth
    h += '<div class="card"><div class="row small"><span>🌍 Earth Health</span><span>' + Math.round(s.earth) + '/100</span></div>' + bar(s.earth) +
      '<div class="small muted">World population ' + U.people(E.worldPop()) + ' · ' + E.alive().length + ' nations · ' + s.wars.length + ' active war' + (s.wars.length === 1 ? '' : 's') + '</div></div>';
    // Budget
    var bal = E.balance(n);
    h += '<div class="card"><div class="row"><h3 style="margin:0">💰 Economy</h3>' +
      '<button class="btn sm blue" data-act="tab" data-arg="econ">' + (E.isLeader() ? 'Budget & details' : 'Details') + ' ›</button></div>' +
      '<div class="row small" style="margin-top:8px"><span class="muted">' + (bal >= 0 ? 'Budget surplus' : 'Budget deficit') + '</span><b class="' + (bal >= 0 ? 'good' : 'bad') + '">' + (bal >= 0 ? '+' : '−') + U.money(Math.abs(bal)) + '/yr</b></div>' +
      (E.isLeader() ? '' : '<div class="small muted" style="margin-top:6px">You do not control the national budget. Gain power to rule ' + esc(n.short) + '.</div>') + '</div>';
    return h;
  }



  // ---------- power base ----------
  function powerBaseCard() {
    var C = G.character, p = S().player, f = C.ensure(p), w = C.weights(), tgt = C.target();
    var dir = tgt - p.influence;
    var h = '<div class="card"><div class="row"><h3 style="margin:0">Power base</h3>' +
      '<span class="small">Influence <b>' + Math.round(p.influence) + '</b> <span class="' + (dir >= 0.5 ? 'good' : dir <= -0.5 ? 'bad' : 'muted') + '">' +
      (Math.abs(dir) < 0.5 ? '(steady)' : (dir > 0 ? '▲ rising to ' : '▼ falling to ') + Math.round(tgt)) + '</span></span></div>' +
      '<div class="small muted" style="margin:6px 0 10px">Your influence drifts towards the support of these groups. In a ' + esc(E.gov(E.pn()).name) + ' the most important are shown first. Build support in the Actions tab ("Power base").</div>';
    C.KEYS.slice().sort(function (a, b) { return w[b] - w[a]; }).forEach(function (k) {
      var fac = C.FACTIONS[k];
      h += '<div class="row small"><span>' + fac.icon + ' ' + fac.name + ' <span class="muted">· counts ' + Math.round(w[k] * 100) + '%</span></span><b>' + Math.round(f[k]) + '</b></div>' +
        bar(f[k], f[k] >= 60 ? 'good' : f[k] >= 30 ? 'warn' : 'bad') + '<div class="small muted" style="margin:-4px 0 8px">' + fac.perk + '</div>';
    });
    return h + '</div>';
  }


  K.tabs.home = { render: homeTab };
})();
