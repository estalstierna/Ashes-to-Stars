// Shared UI toolkit: DOM helpers, modals, event delegation, shared view state and labels.
// Each tab lives in its own file under js/ui/ and registers itself in K.tabs.
var G = window.G || (window.G = {});

G.uiKit = (function () {
  var U = G.util;
  function $(id) { return document.getElementById(id); }
  function S() { return G.state; }
  function esc(s) { return U.esc(s); }

  // ---------- icons ----------
  // Thin line icons (24×24, stroked with the current text colour) replace emoji in the interface.
  var ICONS = {
    home: 'M3 21h18M4 10h16M12 3l8.5 5h-17zM6 10v8M10 10v8M14 10v8M18 10v8',
    bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
    coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM15 9.3c-.5-.9-1.6-1.4-3-1.4-1.7 0-3 .8-3 2s1.3 1.6 3 1.9 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.4M12 6.3v1.6M12 16v1.6',
    rank: 'M6 4l6 4 6-4M6 10l6 4 6-4M6 16l6 4 6-4',
    globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 1 0 0-18zM3 12h18M12 3c2.4 2.6 3.7 5.6 3.7 9s-1.3 6.4-3.7 9c-2.4-2.6-3.7-5.6-3.7-9S9.6 5.6 12 3z',
    flask: 'M9 3h6M10 3v6l-5.6 9.8A1.5 1.5 0 0 0 5.7 21h12.6a1.5 1.5 0 0 0 1.3-2.2L14 9V3M7.2 15h9.6',
    rocket: 'M12 2.5c2.8 2 4.5 5.6 4.5 9.5l-1.8 4.5H9.3L7.5 12c0-3.9 1.7-7.5 4.5-9.5zM12 8.2a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 1 0 0-3.2zM7.6 12.5 4.5 15v3l3.6-1.5M16.4 12.5l3.1 2.5v3l-3.6-1.5M10.5 19.5 12 21.5l1.5-2',
    news: 'M4 4.5h13V19a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2zM17 8.5h3V19a2 2 0 0 1-2 2M7 8.5h7M7 12.5h7M7 16.5h4',
    swords: 'M14.5 17.5 3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M9.5 6.5 13 3h3v3l-3.5 3.5M5 14l-2.5 2.5M4 20l3-3',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z',
    lock: 'M6 11h12v10H6zM8.5 11V7.5a3.5 3.5 0 0 1 7 0V11',
    ballot: 'M4 13h16v8H4zM8 13V4h8v9M10 8.2l1.5 1.5L14.2 7',
    alert: 'M12 3.5 21.5 20h-19zM12 10v4.5M12 17.3v.2',
    doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 12h7M9 16h7',
    flag: 'M5 21V4M5 4h12l-2.5 4L17 12H5',
    orbit: 'M12 10a2 2 0 1 0 0 4 2 2 0 1 0 0-4zM2.5 12c0-2.2 4.3-4 9.5-4s9.5 1.8 9.5 4-4.3 4-9.5 4-9.5-1.8-9.5-4z',
    people: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 1 0 0 7zM2.5 20c0-3.4 2.9-6 6.5-6s6.5 2.6 6.5 6M16 4.4a3.5 3.5 0 0 1 0 6.3M18 14.2c2.2.7 3.5 2.9 3.5 5.8',
    person: 'M12 12a4 4 0 1 0 0-8 4 4 0 1 0 0 8zM4.5 21c0-4 3.4-7 7.5-7s7.5 3 7.5 7',
    case: 'M3 7.5h18V20H3zM8.5 7.5V4.5h7v3M3 12.5h18',
    crown: 'M3 19h18M4 8l4 4 4-7 4 7 4-4-1.8 9H5.8z',
    build: 'M4 21V9.5l5 3v-3l5 3V5h6v16zM2 21h20',
    menu: 'M4 7h16M4 12h16M4 17h16',
    chart: 'M4 4v16h16M8 15l3.5-4 3 2.5L20 7',
    leaf: 'M5 19c0-8 5-13 15-14-1 10-6 15-14 15M5 19l7-7',
    gear: 'M12 9a3 3 0 1 0 0 6 3 3 0 1 0 0-6zM12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
    eye: 'M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5z',
    tv: 'M3 6h18v12H3zM8 21h8M9 2.5 12 6l3-3.5',
    fire: 'M12 21.5c-4 0-6.5-2.6-6.5-6 0-4.5 4.5-6.5 4.5-11 2.5 1.5 4 3.6 4 6 1-.6 1.6-1.6 2-3 1.8 2 2.5 4.3 2.5 7 0 4-2.5 7-6.5 7z',
    check: 'M5 12.5 10 17.5 19.5 7',
    target: 'M12 4.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 1 0 0-15zM12 2v5M12 17v5M2 12h5M17 12h5'
  };
  function icon(name, cls) {
    var d = ICONS[name];
    if (!d) return '';
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>';
  }
  // Emoji that become icons; every other emoji is dropped from the interface.
  var EMOJI_ICON = {
    '🏛': 'home', '⚡': 'bolt', '💰': 'coin', '💸': 'coin', '🏦': 'coin', '🎖': 'rank', '🪖': 'rank', '🌍': 'globe', '🌐': 'globe', '🔬': 'flask', '🧬': 'flask',
    '🚀': 'rocket', '📰': 'news', '📺': 'tv', '⚔': 'swords', '🤝': 'link', '🛡': 'shield', '🔒': 'lock', '🗳': 'ballot', '⚠': 'alert',
    '📜': 'doc', '🕊': 'flag', '🏳': 'flag', '🏴': 'flag', '🛰': 'orbit', '👥': 'people', '👤': 'person', '🕴': 'person', '💼': 'case', '👑': 'crown',
    '🏗': 'build', '🏭': 'build', '📉': 'chart', '🌱': 'leaf', '🌾': 'leaf', '🤖': 'gear', '🕵': 'eye', '🔥': 'fire', '💥': 'fire'
  };
  var EMOJI_RE = /(?:[\u{1F300}-\u{1FAFF}]|[\u2600-\u26FF\u2700-\u27BF\u2B50](?=\uFE0F)|[\u26A0-\u26FF\u2694\u2696\u26B0\u26D3\u26CF\u2622\u2600\u270A\u2708\u26AB\u26A1])\uFE0F?(?:\u200D[\s\S]\uFE0F?)*\s?/gu;
  function swapEmoji(text, inSvg) {
    return text.replace(EMOJI_RE, function (m) {
      var key = String.fromCodePoint(m.codePointAt(0)), name = EMOJI_ICON[key];
      return !inSvg && name ? icon(name) + (/\s$/.test(m) ? ' ' : '') : '';
    });
  }
  // Apply to an HTML string: only text between tags changes, never attributes.
  function tidy(html) {
    return String(html).split(/(<svg[\s\S]*?<\/svg>)/).map(function (part, i) {
      var inSvg = i % 2 === 1;
      return part.replace(/>([^<]+)</g, function (m, txt) { return '>' + swapEmoji(txt, inSvg) + '<'; });
    }).join('');
  }

  // ---------- generic helpers ----------
  function modal(html) {
    $('modal-box').innerHTML = tidy(html);
    $('modal').classList.remove('hidden');
    $('modal-box').scrollTop = 0;
  }
  // Closing is immediate; an inert copy of the sheet slides away on top for the animation.
  function closeModal() {
    var m = $('modal'), box = $('modal-box');
    if (m.classList.contains('hidden')) return;
    if (box.innerHTML && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
      var ghost = document.createElement('div');
      ghost.className = 'modal closing';
      ghost.setAttribute('aria-hidden', 'true');
      var copy = box.cloneNode(true);
      copy.removeAttribute('id');
      copy.querySelectorAll('[id]').forEach(function (e) { e.removeAttribute('id'); });
      copy.querySelectorAll('[data-act]').forEach(function (e) { e.removeAttribute('data-act'); });
      ghost.appendChild(copy);
      document.body.appendChild(ghost);
      copy.scrollTop = box.scrollTop;
      setTimeout(function () { ghost.remove(); }, 180);
    }
    m.classList.add('hidden'); box.innerHTML = '';
  }
  var toastTimer;
  function toast(msg) {
    var t = $('toast');
    t.innerHTML = tidy('<span>' + esc(msg) + '</span>'); t.classList.remove('hidden');
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

  var SECTOR_LABELS = { mil: 'Military', econ: 'Economy', welfare: 'Welfare', sci: 'Science', space: 'Space' };
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
    showResult: showResult, icon: icon, tidy: tidy,
    // Shared view state (which tab and sub-views are open).
    view: { tab: 'home', sci: 'research', world: 'map' },
    // Tabs register { render: fn, after: fn } here; main.js fills in render/resumePending.
    tabs: {}, render: null, resumePending: null
  };
})();
