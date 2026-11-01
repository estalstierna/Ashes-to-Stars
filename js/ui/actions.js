// Actions tab: everything you can do this turn.
(function () {
  var K = G.uiKit, U = G.util, E = G.engine, D = G.data, A = G.actions, EV = G.events, M = G.military;
  var $ = K.$, S = K.S, esc = K.esc, modal = K.modal, closeModal = K.closeModal, toast = K.toast, bar = K.bar, stat = K.stat,
    rankStr = K.rankStr, wealthStr = K.wealthStr, on = K.on, keepScroll = K.keepScroll, signedMoney = K.signedMoney, pctS = K.pctS,
    SECTOR_LABELS = K.SECTOR_LABELS, PACT_NAMES = K.PACT_NAMES, showResult = K.showResult;
  function render() { K.render(); }
  function resumePending() { K.resumePending(); }

  function actTab() {
    var s = S(), p = s.player, n = E.pn(), list = A.available();
    var cats = {};
    list.forEach(function (a) { (cats[a.cat] = cats[a.cat] || []).push(a); });
    var funds = !E.isLeader() ? 'Your wealth: <b>' + wealthStr(p.wealth) + '</b>' :
      n.treasury >= 0 ? 'Treasury: <b>' + U.money(n.treasury) + '</b>' : 'Debt: <b class="bad">' + U.money(E.debt(n)) + '</b>';
    var h = '<div class="card row"><div><b>' + s.ap + '</b> action' + (s.ap === 1 ? '' : 's') + ' left this turn</div><div class="small">' + funds + '</div></div>';
    if (!E.isLeader()) h += '<div class="card small muted">' + roleHint() + '</div>';
    Object.keys(cats).forEach(function (c) {
      h += '<h3 style="margin:16px 0 8px">' + c + '</h3>';
      cats[c].forEach(function (a) {
        var used = s.used.indexOf(a.id) >= 0, cost = A.costFor(a), can = A.affordable(a) && s.ap > 0 && !used;
        var costS = cost === 0 ? 'Free' : (E.isLeader() ? U.money(cost) : wealthStr(cost));
        h += '<div class="action ' + (used ? 'used' : '') + '"><div class="row"><div class="name">' + esc(a.name) + '</div><div class="cost">' + costS + '</div></div>' +
          '<div class="desc">' + esc(a.desc) + '</div>' +
          '<button class="btn sm ' + (can ? 'blue' : '') + '" data-act="doaction" data-arg="' + a.id + '" ' + (can ? '' : 'disabled') + '>' + (used ? 'Done' : 'Do it') + '</button></div>';
      });
    });
    return h;
  }

  function roleHint() {
    var p = S().player, n = E.pn(), dem = E.gov(n).elections;
    if (p.role === 'politician') return dem ? 'Path to power: build influence and popularity, declare your candidacy and win the next election (' + (n.lastElection + 4) + ').' : 'Path to power: there are no elections in ' + esc(n.short) + '. Build influence and strike through palace intrigue when stability is low.';
    if (p.role === 'general') return 'Path to power: win the loyalty of the troops (influence). A coup works best when stability is low. ' + (dem ? 'Or declare candidacy and run in an election.' : '');
    if (p.role === 'corporate') return 'Path to power: grow your fortune, buy influence and take over the state. ' + (n.gov === 'corporate' ? 'In a Corporate State the board can make you ruler.' : 'Outside Corporate States, you need enormous influence.') + (dem ? ' You can also run for office.' : '');
    return '';
  }

  on('doaction', function (id) {
    var a = A.list.filter(function (x) { return x.id === id; })[0];
    if (a.target) {
      var ts = A.targets(a);
      if (!ts || !ts.length) { toast('No valid targets.'); return; }
      var n = E.pn();
      var html = '<div class="kicker">' + esc(a.cat) + '</div><h2>' + esc(a.name) + '</h2><p class="muted">' + esc(a.desc) + '</p>';
      if (a.target === 'gov') {
        html += ts.map(function (g) { return '<button class="choice" data-act="target" data-arg="' + id + '|' + g + '"><div class="t">' + D.govs[g].name + '</div><div class="d">' + esc(D.govs[g].desc) + '</div></button>'; }).join('');
      } else {
        html += ts.map(function (t) {
          return '<button class="choice" data-act="target" data-arg="' + id + '|' + t.id + '"><div class="t"><span class="dot" style="background:' + t.color + '"></span>' + esc(t.name) + '</div>' +
            '<div class="d">Military ' + U.num(E.power(t)) + ' (you ' + U.num(E.power(n)) + ') · Relations ' + Math.round(E.relation(n, t)) + '</div></button>';
        }).join('');
      }
      html += '<button class="btn" data-act="close">Cancel</button>';
      modal(html);
      return;
    }
    doAction(id);
  });
  on('target', function (arg) { var parts = arg.split('|'); closeModal(); doAction(parts[0], parts[1]); });

  function doAction(id, target) {
    var res = A.perform(id, target);
    if (res === null) { toast('Cannot do that right now.'); return; }
    render();
    if (S().succession) { showResult(res, resumePending); return; }
    toast(res);
  }


  K.tabs.act = { render: actTab };
})();
