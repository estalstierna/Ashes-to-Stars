// Shared helpers: seeded RNG, math, formatting.
var G = window.G || (window.G = {});

G.util = (function () {
  // mulberry32 seeded RNG. State lives in G.state.rng so saves stay deterministic.
  function rand() {
    var s = G.state;
    var t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function chance(p) { return rand() < p; }
  function randInt(a, b) { return a + Math.floor(rand() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  var units = [
    [1e15, 'Qa'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']
  ];
  // Format a number with K/M/B/T suffixes.
  function num(v, digits) {
    if (digits === undefined) digits = 1;
    var neg = v < 0; v = Math.abs(v);
    for (var i = 0; i < units.length; i++) {
      if (v >= units[i][0]) {
        return (neg ? '-' : '') + (v / units[i][0]).toFixed(digits).replace(/\.0+$/, '') + units[i][1];
      }
    }
    return (neg ? '-' : '') + (v < 10 ? v.toFixed(digits).replace(/\.0+$/, '') : Math.round(v).toString());
  }
  // GDP and money are stored in billions of dollars.
  function money(billions) { return '$' + num(billions * 1e9); }
  // Population stored in millions.
  function people(millions) { return num(millions * 1e6); }
  function pct(v, digits) { return (v * 100).toFixed(digits === undefined ? 1 : digits) + '%'; }
  function signed(v, digits) { var s = v.toFixed(digits || 0); return v >= 0 ? '+' + s : s; }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Fill {placeholders} in a template string.
  function fill(tpl, ctx) {
    return tpl.replace(/\{(\w+)\}/g, function (_, k) { return ctx[k] !== undefined ? ctx[k] : '{' + k + '}'; });
  }

  return {
    rand: rand, chance: chance, randInt: randInt, pick: pick, clamp: clamp,
    sigmoid: sigmoid, shuffle: shuffle, num: num, money: money, people: people,
    pct: pct, signed: signed, esc: esc, fill: fill
  };
})();
