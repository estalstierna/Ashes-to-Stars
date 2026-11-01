// Science tab: research tree and the space race.
(function () {
  var K = G.uiKit, U = G.util, E = G.engine, D = G.data, A = G.actions, EV = G.events, M = G.military;
  var $ = K.$, S = K.S, esc = K.esc, modal = K.modal, closeModal = K.closeModal, toast = K.toast, bar = K.bar, stat = K.stat,
    rankStr = K.rankStr, wealthStr = K.wealthStr, on = K.on, keepScroll = K.keepScroll, signedMoney = K.signedMoney, pctS = K.pctS,
    SECTOR_LABELS = K.SECTOR_LABELS, PACT_NAMES = K.PACT_NAMES, showResult = K.showResult;
  function render() { K.render(); }
  function resumePending() { K.resumePending(); }

  // ---------- science: research tree + space race ----------
  function scienceTab() {
    return researchTab();
  }

  function researchTab() {
    var R = G.research, n = E.pn(), rs = R.ensure(n), lead = E.isLeader(), rate = R.rate(n);
    var f = E.funds(n), h = '';
    var act = rs.active ? R.tech(rs.active) : null;
    h += '<div class="card"><h2>🔬 Technology</h2><div class="grid2" style="margin-top:8px">' +
      stat('Tech level #' + E.rank(n, function (x) { return x.tech; }), n.tech.toFixed(1)) +
      stat('Research', Math.round(rate) + ' <span class="small muted">RP/yr</span>') +
      stat('Science budget', U.money(f.sci) + '<span class="small muted">/yr</span>') +
      stat('Discoveries', rs.done.length + ' / ' + R.TECHS.length) +
      '</div>' +
      '<div class="small muted" style="margin-top:8px">Research points (RP) come from the <b>science budget</b> as a share of GDP' + (lead ? ' (set it in the Economy tab)' : '') +
      ', so even a small nation can lead in science. The tech level also rises on its own and boosts the economy, the military and medicine.</div>';
    if (act) {
      var pct = U.clamp(rs.progress / act.cost * 100, 0, 100), eta = R.eta(n, act);
      h += '<div style="margin-top:12px"><div class="row small"><span>Researching <b>' + esc(act.name) + '</b></span><span>' + Math.floor(rs.progress) + ' / ' + act.cost + ' RP</span></div>' + bar(pct, '') +
        '<div class="small muted">' + (eta === Infinity ? 'No research funding!' : 'About ' + eta + ' year(s) left') + '</div></div>';
    } else {
      h += '<div class="small warn" style="margin-top:12px">' + (lead ? 'Nothing is being researched. Pick a discovery below. Points are saved until you do (' + Math.floor(rs.bank) + ' RP banked).' : 'The government chooses what to research.') + '</div>';
    }
    h += '</div>';

    Object.keys(R.CATS).forEach(function (ck) {
      var cat = R.CATS[ck];
      h += '<div class="card"><h3>' + cat.icon + ' ' + cat.name + '</h3>';
      R.TECHS.filter(function (t) { return t.cat === ck; }).forEach(function (t) {
        var st = R.state(n, t), first = S().techFirsts && S().techFirsts[t.id];
        var eff = techEffects(t);
        if (st === 'done') {
          h += '<div class="row small" style="padding:6px 0;border-bottom:1px solid #1a2230"><span class="good">✓ ' + esc(t.name) + '</span><span class="muted">' + eff + '</span></div>';
          return;
        }
        if (st === 'locked') {
          h += '<div class="row small" style="padding:6px 0;border-bottom:1px solid #1a2230"><span class="muted">🔒 ' + esc(t.name) + '</span><span class="muted" style="text-align:right">needs ' + esc(R.missing(n, t).join(', ')) + '</span></div>';
          return;
        }
        var eta = R.eta(n, t);
        h += '<div class="action' + (st === 'active' ? ' sel-action' : '') + '" style="margin-top:8px"><div class="row"><div class="name">' + esc(t.name) + '</div><div class="cost">' + t.cost + ' RP</div></div>' +
          '<div class="desc">' + esc(t.desc) + '</div><div class="small good" style="margin-bottom:6px">' + eff + '</div>' +
          '<div class="small muted" style="margin-bottom:8px">' + (eta === Infinity ? 'No research funding' : '≈ ' + eta + ' year(s)') +
          (first ? ' · first discovered by ' + esc(E.nation(first.nation).short) + ' (' + first.year + ')' : '') + '</div>' +
          (st === 'active' ? '<span class="tag pact">Researching…</span>' : lead ? '<button class="btn sm blue" data-act="research" data-arg="' + t.id + '">' + (act ? 'Switch to this' : 'Research') + '</button>' : '') + '</div>';
      });
      h += '</div>';
    });

    h += '<div class="card"><h3>Most advanced nations</h3>';
    E.alive().slice().sort(function (a, b) { return b.tech - a.tech; }).slice(0, 8).forEach(function (x, i) {
      h += '<div class="row small" style="padding:4px 0"><span>' + (i + 1) + '. <span class="dot" style="background:' + x.color + '"></span>' + esc(x.short) + (x === n ? ' (you)' : '') + '</span>' +
        '<span>tech ' + x.tech.toFixed(0) + ' <span class="muted">· ' + R.ensure(x).done.length + ' discoveries</span></span></div>';
    });
    return h + '</div>';
  }
  function techEffects(t) {
    var b = t.b, out = [];
    if (b.growth) out.push('+' + (b.growth * 100).toFixed(1) + '% growth');
    if (b.ceiling) out.push('+' + Math.round(b.ceiling * 100) + '% potential');
    if (b.pop) out.push('+' + (b.pop * 100).toFixed(1) + '% pop. growth');
    if (b.approval) out.push((b.approval > 0 ? '+' : '') + b.approval + ' approval');
    if (b.stability) out.push('+' + b.stability + ' stability');
    if (b.space) out.push('+' + Math.round(b.space * 100) + '% space');
    if (b.earth) out.push('Earth +' + b.earth + '/yr');
    if (b.mil) out.push('+' + Math.round(b.mil * 100) + '% military');
    if (b.research) out.push('+' + Math.round(b.research * 100) + '% research');
    if (b.life) out.push('+' + b.life + ' years of life');
    return out.join(' · ');
  }
  on('research', function (id) {
    var n = E.pn(), t = G.research.tech(id);
    if (G.research.start(n, id)) { E.save(); keepScroll(render); toast('Researching ' + t.name + '.'); }
  });




  K.tabs.sci = { render: scienceTab };
})();
