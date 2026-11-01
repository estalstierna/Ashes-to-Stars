// Shared UI toolkit: DOM helpers, modals, event delegation, shared view state and labels.
// Each tab lives in its own file under js/ui/ and registers itself in K.tabs.
var G = window.G || (window.G = {});

G.uiKit = (function () {
  var U = G.util;
  function $(id) { return document.getElementById(id); }
  function S() { return G.state; }
  function esc(s) { return U.esc(s); }

  // ---------- generic helpers ----------
  function modal(html) {
    $('modal-box').innerHTML = html;
    $('modal').classList.remove('hidden');
    $('modal-box').scrollTop = 0;
  }
  function closeModal() { $('modal').classList.add('hidden'); $('modal-box').innerHTML = ''; }
  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.add('hidden'); }, 2600);
  }
  function bar(v, cls) {
    v = U.clamp(v, 0, 100);
    if (!cls) cls = v >= 60 ? 'good' : v >= 35 ? 'warn' : 'bad';
    return '<div class="bar ' + cls + '"><i style="width:' + v.toFixed(0) + '%"></i></div>';
  }
  function stat(k, v) { return '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + '</div></div>'; }
  function rankStr(r) { return '#' + r; }
  function wealthStr(m) { return U.money(m / 1000); }

  // Event delegation: elements with data-act="name" and optional data-arg.
  var handlers = {};
  function on(name, fn) { handlers[name] = fn; }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var fn = handlers[el.getAttribute('data-act')];
    if (fn) { e.preventDefault(); fn(el.getAttribute('data-arg'), el); }
  });
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.getAttribute('data-input') && handlers[el.getAttribute('data-input')]) handlers[el.getAttribute('data-input')](el.value, el);
  });

  function keepScroll(fn) { var y = window.scrollY; fn(); window.scrollTo(0, y); }
  function signedMoney(v) { return (v >= 0 ? '+' : '−') + U.money(Math.abs(v)); }
  function pctS(v, d) { return (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(d === undefined ? 1 : d) + '%'; }

  var SECTOR_LABELS = { mil: '🎖️ Military', econ: '🏗️ Economy', welfare: '🏥 Welfare', sci: '🔬 Science', space: '🚀 Space' };
  var PACT_NAMES = { trade: '📦 Trade', nap: '🕊️ Non-aggression', defensive: '🛡️ Defensive pact', alliance: '🤝 Alliance' };

  // A simple result message with a Continue button; `next` runs afterwards.
  var resultNext = null;
  function showResult(text, next) {
    modal('<p style="font-size:16px">' + esc(text) + '</p><button class="btn primary" data-act="resultok">Continue</button>');
    resultNext = next;
  }
  on('resultok', function () { closeModal(); var f = resultNext; resultNext = null; if (f) f(); });

  return {
    $: $, S: S, esc: esc, modal: modal, closeModal: closeModal, toast: toast, bar: bar, stat: stat, rankStr: rankStr, wealthStr: wealthStr,
    on: on, handlers: handlers, keepScroll: keepScroll, signedMoney: signedMoney, pctS: pctS, SECTOR_LABELS: SECTOR_LABELS, PACT_NAMES: PACT_NAMES,
    showResult: showResult,
    // Shared view state (which tab and sub-views are open).
    view: { tab: 'home', sci: 'research', world: 'map' },
    // Tabs register { render: fn, after: fn } here; main.js fills in render/resumePending.
    tabs: {}, render: null, resumePending: null
  };
})();
