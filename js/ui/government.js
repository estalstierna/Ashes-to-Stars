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

  K.lawsView = lawsView;
})();
