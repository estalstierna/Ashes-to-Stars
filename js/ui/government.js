// Government views on the Home tab: laws & policies (and the cabinet, see cabinet.js).
(function () {
  var K = G.uiKit, U = G.util, E = G.engine, A = G.actions, L = G.laws;
  var $ = K.$, S = K.S, esc = K.esc, modal = K.modal, closeModal = K.closeModal, toast = K.toast, bar = K.bar, on = K.on, keepScroll = K.keepScroll;
  function render() { K.render(); }

  // Human-readable effect list for a law option.
  function effects(fx) {
    var out = [];
    function pct(v) { return (v > 0 ? '+' : '') + (v * 100).toFixed(1).replace('.0', '') + '%'; }
    if (fx.growth) out.push([pct(fx.growth) + ' growth', fx.growth > 0]);
    if (fx.approval) out.push([(fx.approval > 0 ? '+' : '') + fx.approval + ' approval', fx.approval > 0]);
    if (fx.stability) out.push([(fx.stability > 0 ? '+' : '') + fx.stability + ' stability', fx.stability > 0]);
    if (fx.pop) out.push([pct(fx.pop) + ' population growth', fx.pop > 0]);
    if (fx.research) out.push([pct(fx.research) + ' research', fx.research > 0]);
    if (fx.space) out.push([pct(fx.space) + ' space progress', fx.space > 0]);
    if (fx.earth) out.push([(fx.earth > 0 ? '+' : '') + fx.earth + ' Earth Health/yr', fx.earth > 0]);
    if (fx.mil) out.push([pct(fx.mil) + ' military quality', fx.mil > 0]);
    if (fx.consc) out.push([fx.consc > 1 ? 'conscription resented ×' + fx.consc : 'conscription resented ×' + fx.consc, fx.consc < 1]);
    if (fx.threat) out.push(['threat gained ×' + fx.threat, fx.threat < 1]);
    var names = { military: 'military', business: 'business', media: 'media', public: 'the people', intel: 'spies' };
    if (fx.fac) for (var k in fx.fac) out.push([(fx.fac[k] > 0 ? 'pleases ' : 'angers ') + names[k], fx.fac[k] > 0]);
    if (!out.length) return '<span class="muted">No special effects (the default).</span>';
    return out.map(function (x) { return '<span class="' + (x[1] ? 'good' : 'bad') + '">' + x[0] + '</span>'; }).join(' · ');
  }

  function lawsView() {
    var n = E.pn(), lead = E.isLeader(), laws = L.ensure(n);
    var h = '<div class="card"><h2>📜 Laws & policies</h2><div class="small muted">Each area has one active law. ' +
      (lead ? 'Changing a law uses one action, upsets some people briefly, and the same area can only change again after ' + L.COOLDOWN + ' years.' : 'Only the head of state can change the laws.') + '</div></div>';
    L.LAWS.forEach(function (l) {
      var cd = L.cooldown(n, l.id);
      h += '<div class="card"><div class="row"><h3 style="margin:0">' + l.icon + ' ' + esc(l.name) + '</h3>' + (cd ? '<span class="tag">changeable in ' + cd + ' yr</span>' : '') + '</div>';
      l.options.forEach(function (o) {
        var active = laws[l.id] === o.id;
        h += '<button class="choice' + (active ? ' sel' : '') + '" data-act="lawpick" data-arg="' + l.id + '|' + o.id + '" style="margin-top:8px"' + (active ? ' disabled' : '') + '>' +
          '<div class="row"><div class="t">' + esc(o.name) + '</div>' + (active ? '<span class="tag pact">In force</span>' : '') + '</div>' +
          '<div class="d">' + esc(o.desc) + '</div><div class="d" style="margin-top:4px">' + effects(o.fx) + '</div></button>';
      });
      h += '</div>';
    });
    return h;
  }

  on('lawpick', function (arg) {
    var n = E.pn(), parts = arg.split('|'), l = L.law(parts[0]), o = L.option(parts[0], parts[1]);
    if (!E.isLeader()) { toast('Only the head of state can change the laws.'); return; }
    var cd = L.cooldown(n, l.id), a = A.list.filter(function (x) { return x.id === 'law'; })[0];
    var can = !cd && S().ap > 0 && A.affordable(a);
    modal('<div class="kicker">' + l.icon + ' ' + esc(l.name) + '</div><h2>' + esc(o.name) + '</h2><p>' + esc(o.desc) + '</p>' +
      '<p class="small">' + effects(o.fx) + '</p>' +
      '<p class="small muted">Replaces: ' + esc(L.option(l.id, L.ensure(n)[l.id]).name) + '. Costs one action and ' + U.money(A.costFor(a)) + '.' +
      (cd ? ' <span class="bad">This area can change again in ' + cd + ' years.</span>' : S().ap <= 0 ? ' <span class="bad">No actions left this turn.</span>' : '') + '</p>' +
      '<button class="btn primary" data-act="lawpass" data-arg="' + arg + '" ' + (can ? '' : 'disabled') + '>Pass the law</button><button class="btn" data-act="close">Cancel</button>');
  });
  on('lawpass', function (arg) {
    closeModal();
    var res = A.perform('law', arg);
    if (res === null) { toast('Cannot change that law right now.'); return; }
    keepScroll(render); toast(res);
  });

  // ---------- cabinet & rivals ----------
  var CB = G.cabinet;
  function starStr(n) { return '★★★★★'.slice(0, Math.min(5, n)) + '<span class="muted">' + '☆☆☆☆☆'.slice(0, Math.max(0, 5 - n)) + '</span>' + (n > 5 ? '<b class="good">+</b>' : ''); }
  function traitTags(m) {
    return (m.traits || []).map(function (t) { var T = CB.TRAITS[t]; return T ? '<span class="tag ' + (T.good ? 'pact' : T.good === false ? 'war' : '') + '" title="' + esc(T.desc) + '">' + T.name + '</span>' : ''; }).join(' ');
  }

  function cabinetView() {
    CB.ensure();
    var s = S(), n = E.pn(), lead = E.isLeader(), h = '';
    if (lead && s.cabinet) {
      h += '<div class="card"><h2>👥 Your cabinet</h2><div class="small muted">Ministers boost their area by their competence (★). Loyalty follows your influence; ambitious ministers with low loyalty may quit and turn against you.</div></div>';
      CB.POST_IDS.forEach(function (post) {
        var m = s.cabinet[post], P0 = CB.POSTS[post];
        h += '<div class="action"><div class="row"><div class="name">' + P0.icon + ' Minister of ' + P0.name + '</div><span class="small">' + starStr(CB.stars(m)) + '</span></div>' +
          '<div class="desc"><b>' + esc(m.name) + '</b> (' + m.age + ') · in office since ' + m.since + ' · ' + esc(P0.effect) + '</div>' +
          '<div style="margin:4px 0">' + traitTags(m) + '</div>' +
          '<div class="row small"><span>Loyalty</span><span>' + Math.round(m.loyalty) + '</span></div>' + bar(m.loyalty) +
          '<button class="btn sm" data-act="cabreplace" data-arg="' + post + '">Replace</button></div>';
      });
    } else {
      h += '<div class="card"><h2>👥 Government</h2><div class="small muted">' + (n.leader ? esc(E.title(n)) + ' ' + esc(n.leader.name) + ' runs the government of ' + esc(n.short) + '. ' : '') +
        'You will form your own cabinet when you come to power.</div></div>';
    }
    // Rivals
    h += '<div class="card"><h2>⚔️ Your rivals</h2><div class="small muted">Named enemies who grow stronger when you are unpopular. They smear you, challenge you in elections and, if they are generals, may try a coup.</div></div>';
    (s.rivals || []).forEach(function (r) {
      var R = CB.RIVAL_ROLES[r.role] || { name: r.role, icon: '👤' };
      var acts = [['rival-discredit', 'Discredit'], ['rival-investigate', 'Investigate'], ['rival-coopt', 'Offer a ministry'], ['rival-arrest', 'Arrest']];
      var avail = A.available();
      h += '<div class="action"><div class="row"><div class="name">' + R.icon + ' ' + esc(r.name) + '</div><span class="tag">' + esc(R.name) + '</span></div>' +
        '<div class="desc">Age ' + r.age + ' ' + traitTags(r) + '</div>' +
        '<div class="row small"><span>Power</span><span class="' + (r.power >= 60 ? 'bad' : r.power >= 35 ? 'warn' : '') + '">' + Math.round(r.power) + '</span></div>' + bar(r.power, r.power >= 60 ? 'bad' : r.power >= 35 ? 'warn' : 'good') +
        '<div class="row small"><span>Hostility towards you</span><span>' + Math.round(r.hostility) + '</span></div>' + bar(r.hostility, 'bad') +
        '<div class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-start;margin-top:6px">' + acts.map(function (x) {
          var a = avail.filter(function (y) { return y.id === x[0]; })[0];
          if (!a) return '';
          var can = A.affordable(a) && S().ap > 0 && S().used.indexOf(a.id) < 0;
          var cost = A.costFor(a), cs = cost === 0 ? '' : ' · ' + (a.role === 'leader' ? U.money(cost) : K.wealthStr(cost));
          return '<button class="btn sm ' + (can ? 'blue' : '') + '" data-act="rivalact" data-arg="' + x[0] + '|' + r.id + '" ' + (can ? '' : 'disabled') + '>' + x[1] + cs + '</button>';
        }).join('') + '</div></div>';
    });
    return h + '<div class="small muted" style="margin-bottom:10px">Acting against a rival uses one action.</div>';
  }

  on('cabreplace', function (post) {
    var P0 = CB.POSTS[post], cur = S().cabinet[post];
    modal('<div class="kicker">' + P0.icon + ' Minister of ' + P0.name + '</div><h2>Choose a replacement</h2><p class="small muted">Currently: ' + esc(cur.name) + ' ' + starStr(CB.stars(cur)) + '. ' +
      'Firing an ambitious or disloyal minister turns them into a rival.</p>' +
      CB.candidates(post).map(function (c) {
        return '<button class="choice" data-act="cabappoint" data-arg="' + post + '|' + c.id + '"><div class="row"><div class="t">' + esc(c.name) + ' (' + c.age + ')</div><span class="small">' + starStr(CB.stars(c)) + '</span></div>' +
          '<div class="d">' + (traitTags(c) || 'No notable traits') + ' · loyalty ' + Math.round(c.loyalty) + '</div></button>';
      }).join('') + '<button class="btn" data-act="close">Keep ' + esc(cur.name) + '</button>');
  });
  on('cabappoint', function (arg) {
    var parts = arg.split('|'); closeModal();
    var res = CB.appoint(parts[0], parts[1]); E.save(); keepScroll(render); if (res) toast(res);
  });
  on('rivalact', function (arg) {
    var parts = arg.split('|'), res = A.perform(parts[0], parts[1]);
    if (res === null) { toast('Not possible right now.'); return; }
    keepScroll(render); toast(res);
  });

  K.lawsView = lawsView;
  K.cabinetView = cabinetView;
})();
