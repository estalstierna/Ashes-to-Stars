// News tab: the archive of everything that happened.
(function () {
  var K = G.uiKit, U = G.util, E = G.engine, D = G.data, A = G.actions, EV = G.events, M = G.military;
  var $ = K.$, S = K.S, esc = K.esc, modal = K.modal, closeModal = K.closeModal, toast = K.toast, bar = K.bar, stat = K.stat,
    rankStr = K.rankStr, wealthStr = K.wealthStr, on = K.on, keepScroll = K.keepScroll, signedMoney = K.signedMoney, pctS = K.pctS,
    SECTOR_LABELS = K.SECTOR_LABELS, PACT_NAMES = K.PACT_NAMES, showResult = K.showResult;
  function render() { K.render(); }
  function resumePending() { K.resumePending(); }

  function logTab() {
    var h = '<h3>News archive</h3>', y = null;
    S().log.slice(0, 200).forEach(function (l) {
      if (l.year !== y) { y = l.year; h += '<div class="log-year">' + y + '</div>'; }
      h += '<div class="log-item ' + l.type + '">' + esc(l.text) + '</div>';
    });
    return h;
  }


  K.tabs.log = { render: logTab };
})();
