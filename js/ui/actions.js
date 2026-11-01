// Actions tab: everything you can do this turn.
(function () {
  var K = G.uiKit, U = G.util, E = G.engine, D = G.data, A = G.actions, EV = G.events, M = G.military;
  var $ = K.$, S = K.S, esc = K.esc, modal = K.modal, closeModal = K.closeModal, toast = K.toast, bar = K.bar, stat = K.stat,
    rankStr = K.rankStr, wealthStr = K.wealthStr, on = K.on, keepScroll = K.keepScroll, signedMoney = K.signedMoney, pctS = K.pctS,
    SECTOR_LABELS = K.SECTOR_LABELS, PACT_NAMES = K.PACT_NAMES, showResult = K.showResult;
  function render() { K.render(); }
  function resumePending() { K.resumePending(); }

  function actTab() {
    var s = S(), p = s.player, n = E.pn(), list = A.available().filter(function (a) { return !a.hidden; });
    var cats = {};
    list.forEach(function (a) { (cats[a.cat] = cats[a.cat] || []).push(a); });
    var funds = !E.isLeader() ? 'Your wealth: <b>' + wealthStr(p.wealth) + '</b>' :
      n.treasury >= 0 ? 'Treasury: <b>' + U.money(n.treasury) + '</b>' : 'Debt: <b class="bad">' + U.money(E.debt(n)) + '</b>';
    var h = '<div class="card row"><div><b>' + s.ap + '</b> action' + (s.ap === 1 ? '' : 's') + ' left this turn</div><div class="small">' + funds + '</div></div>';
    if (!E.isLeader()) h += '<div class="card small muted">' + roleHint() + '</div>';
    Object.keys(cats).forEach(function (c) {
      h += '<h3 style="margin:16px 0 8px">' + c + '</h3>';
      cats[c].forEach(function (a) {
        var used = s.used.indexOf(a.id) >= 0, cost = A.costFor(a), cd = A.cooldown(a), can = A.affordable(a) && s.ap > 0 && !used;
        var costS = cost === 0 ? 'Free' : (E.isLeader() ? U.money(cost) : wealthStr(cost));
        h += '<div class="action ' + (used ? 'used' : '') + '"><div class="row"><div class="name">' + esc(a.name) + '</div><div class="cost">' + costS + '</div></div>' +
          '<div class="desc">' + esc(a.desc) + (a.cd ? ' <span class="muted">Can be used every ' + a.cd + ' year' + (a.cd === 1 ? '' : 's') + '.</span>' : '') + '</div>' +
          '<button class="btn sm ' + (can ? 'blue' : '') + '" data-act="doaction" data-arg="' + a.id + '" ' + (can ? '' : 'disabled') + '>' +
          (used ? 'Done' : cd > 0 ? 'Ready in ' + cd + ' yr' : 'Do it') + '</button></div>';
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
  on('target', function (arg) {
    var parts = arg.split('|'); closeModal();
    if (parts[0] === 'war') return goalPicker(parts[1]);
    if (parts[0] === 'peace') { var w = E.warBetween(E.pn(), E.nation(parts[1])); if (w && !w.independence) return negotiation(parts[1]); }
    doAction(parts[0], parts[1]);
  });

  // ---------- war goals ----------
  function goalPicker(targetId) {
    var n = E.pn(), t = E.nation(targetId), W = G.war;
    var html = '<div class="kicker">Declare war on ' + esc(t.name) + '</div><h2>Choose your war goal</h2>' +
      '<p class="small muted">Your goal decides how the world reacts. Your power ' + U.num(E.power(n)) + ' vs their ' + U.num(E.power(t, true)) +
      (E.allies(t).length ? ' (their allies: ' + E.allies(t).map(function (x) { return esc(x.short); }).join(', ') + ')' : '') + '.</p>';
    W.goalsAgainst(n, t).forEach(function (g) {
      var G0 = W.GOALS[g], th = G0.threat;
      var extra = g === 'liberate' ? ' (' + E.occupiedBy(t).map(function (d) { return esc(d.short); }).join(', ') + ')' : '';
      html += '<button class="choice" data-act="wargoal" data-arg="' + targetId + '|' + g + '"><div class="t">' + G0.icon + ' ' + esc(G0.name) + extra + '</div>' +
        '<div class="d">' + esc(G0.desc) + ' <span class="' + (th > 0 ? 'bad' : th < 0 ? 'good' : '') + '">' + (th > 0 ? 'More' : th < 0 ? 'Less' : 'Normal') + ' threat.</span></div></button>';
    });
    modal(html + '<button class="btn" data-act="close">Cancel</button>');
  }
  on('wargoal', function (arg) { closeModal(); doAction('war', arg); });

  // ---------- peace negotiation ----------
  var negState = null;
  function negotiation(targetId) {
    var n = E.pn(), t = E.nation(targetId), w = E.warBetween(n, t);
    if (!negState || negState.target !== targetId) negState = { target: targetId, chosen: {} };
    var terms = G.war.terms(w, n), chosen = Object.keys(negState.chosen).filter(function (k) { return negState.chosen[k]; });
    var acc = G.war.acceptance(w, n, chosen), sc = G.war.score(w, n);
    var html = '<div class="kicker">Peace talks with ' + esc(t.name) + '</div><h2>Your terms</h2>' +
      '<div class="small muted" style="margin-bottom:8px">War score <b class="' + (sc >= 0 ? 'good' : 'bad') + '">' + Math.round(sc) + '</b> · goal: ' + esc(G.war.GOALS[w.goal || 'conquer'].name) +
      ' · you occupy ' + G.war.occupiedBy(w, n).length + ' provinces, they occupy ' + G.war.occupiedBy(w, t).length + '.</div>';
    terms.forEach(function (x) {
      var on = !!negState.chosen[x.id];
      html += '<button class="choice' + (on ? ' sel' : '') + '" data-act="negterm" data-arg="' + x.id + '"><div class="row"><div class="t">' + (on ? '☑ ' : '☐ ') + esc(x.name) + '</div>' +
        '<span class="small ' + (x.price < 0 ? 'good' : 'muted') + '">' + (x.price < 0 ? '−' + (-x.price) : x.price) + '</span></div><div class="d">' + esc(x.desc) + '</div></button>';
    });
    var pct = Math.round(acc.chance * 100);
    html += '<div class="row" style="margin-top:6px"><span class="small">' + (chosen.length ? 'Total price ' + acc.price : 'White peace (no terms)') + '</span><b class="' + (pct >= 60 ? 'good' : pct >= 35 ? 'warn' : 'bad') + '">' + pct + '% likely</b></div>' + bar(pct) +
      '<button class="btn primary" data-act="negpropose">Propose peace</button><button class="btn" data-act="close">Cancel</button>';
    modal(html);
  }
  on('negterm', function (id) {
    negState.chosen[id] = !negState.chosen[id];
    // Annexing makes other land terms pointless.
    if (id === 'annex' && negState.chosen.annex) negState.chosen.occupied = false;
    negotiation(negState.target);
  });
  on('negpropose', function () {
    var st = negState, chosen = Object.keys(st.chosen).filter(function (k) { return st.chosen[k]; });
    negState = null; closeModal();
    doAction('peace', st.target + '|' + chosen.join(','));
  });

  function doAction(id, target) {
    var res = A.perform(id, target);
    if (res === null) { toast('Cannot do that right now.'); return; }
    render();
    if (S().succession) { showResult(res, resumePending); return; }
    toast(res);
  }


  K.tabs.act = { render: actTab };
})();
