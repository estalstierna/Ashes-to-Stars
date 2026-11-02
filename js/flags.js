// National flags as inline SVG (viewBox 0 0 30 20, i.e. 3:2).
(function () {
  var G = window.G = window.G || {};

  // Five-pointed star centred at (cx, cy) with outer radius r.
  function star(cx, cy, r, fill, rot) {
    var pts = [];
    rot = rot || 0;
    for (var i = 0; i < 10; i++) {
      var a = Math.PI / 5 * i - Math.PI / 2 + rot, rr = i % 2 ? r * 0.4 : r;
      pts.push((cx + Math.cos(a) * rr).toFixed(2) + ',' + (cy + Math.sin(a) * rr).toFixed(2));
    }
    return '<polygon points="' + pts.join(' ') + '" fill="' + fill + '"/>';
  }
  function rect(x, y, w, h, fill) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + fill + '"/>'; }
  function circle(cx, cy, r, fill, extra) { return '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function hstripes(cols) { var h = 20 / cols.length; return cols.map(function (c, i) { return rect(0, i * h, 30, h + 0.05, c); }).join(''); }
  function vstripes(cols) { var w = 30 / cols.length; return cols.map(function (c, i) { return rect(i * w, 0, w + 0.05, 20, c); }).join(''); }
  function ring(cx, cy, R, n, r, fill) {
    var s = '';
    for (var i = 0; i < n; i++) { var a = Math.PI * 2 * i / n - Math.PI / 2; s += star(cx + Math.cos(a) * R, cy + Math.sin(a) * R, r, fill); }
    return s;
  }
  function crescent(cx, cy, r, fill, bg, dx) {
    return circle(cx, cy, r, fill) + circle(cx + (dx || r * 0.3), cy, r * 0.82, bg);
  }

  var FLAGS = {
    USA: function () {
      var s = '';
      for (var i = 0; i < 13; i++) s += rect(0, i * 20 / 13, 30, 20 / 13 + 0.05, i % 2 ? '#fff' : '#b22234');
      s += rect(0, 0, 13, 20 * 7 / 13, '#3c3b6e');
      // 2077 canton: a ring of stars around a white Moon.
      s += circle(6.5, 5.4, 1.6, '#fff') + ring(6.5, 5.4, 3.7, 12, 0.6, '#fff');
      return s;
    },
    EF: function () {
      return rect(0, 0, 30, 20, '#003399') + rect(0, 16.2, 30, 1.2, '#fff') + ring(15, 8.3, 5, 12, 0.85, '#ffcc00');
    },
    RUS: function () {
      // Tricolour with a gold double-headed eagle on a red shield.
      return hstripes(['#fff', '#0039a6', '#d52b1e']) +
        '<path d="M15 6.2c-.7-.9-1.8-1.4-3-1.2.6.4.9.9 1 1.5-1-.3-2-.2-2.8.3 1 .3 1.6.9 1.9 1.7-.8.1-1.5.5-1.9 1.1 1.1 0 2 .4 2.6 1.1l.5 2.6c.6.8 1.1 1.5 1.7 2.1.6-.6 1.1-1.3 1.7-2.1l.5-2.6c.6-.7 1.5-1.1 2.6-1.1-.4-.6-1.1-1-1.9-1.1.3-.8.9-1.4 1.9-1.7-.8-.5-1.8-.6-2.8-.3.1-.6.4-1.1 1-1.5-1.2-.2-2.3.3-3 1.2z" fill="#d4af37" stroke="#8a6d1c" stroke-width="0.2"/>' +
        '<path d="M13.9 8.9h2.2v2c0 .8-.5 1.4-1.1 1.7-.6-.3-1.1-.9-1.1-1.7z" fill="#d52b1e" stroke="#8a6d1c" stroke-width="0.15"/>';
    },
    CHN: function () {
      return rect(0, 0, 30, 20, '#de2910') + star(5, 5, 3, '#ffde00') +
        star(10, 2, 1, '#ffde00', 0.4) + star(12, 4, 1, '#ffde00', 0.8) + star(12, 7, 1, '#ffde00', 0) + star(10, 9, 1, '#ffde00', 0.4);
    },
    IND: function () {
      var spokes = '';
      for (var i = 0; i < 24; i++) { var a = Math.PI * 2 * i / 24; spokes += '<line x1="15" y1="10" x2="' + (15 + Math.cos(a) * 2.6).toFixed(2) + '" y2="' + (10 + Math.sin(a) * 2.6).toFixed(2) + '" stroke="#000080" stroke-width="0.18"/>'; }
      return hstripes(['#ff9933', '#fff', '#138808']) + circle(15, 10, 2.8, 'none', ' stroke="#000080" stroke-width="0.45"') + spokes + circle(15, 10, 0.5, '#000080');
    },
    PAC: function () {
      // White field, a sun split red over blue, and a navy base stripe.
      return rect(0, 0, 30, 20, '#fff') + '<path d="M9.5 9 a5.5 5.5 0 0 1 11 0z" fill="#c60c30"/><path d="M9.5 9 a5.5 5.5 0 0 0 11 0z" fill="#003478"/>' +
        rect(0, 17, 30, 3, '#1b2a49');
    },
    PAU: function () {
      return hstripes(['#ce1126', '#000', '#078930']) + rect(0, 6.67, 30, 0.5, '#fcd116') + rect(0, 12.83, 30, 0.5, '#fcd116') + star(15, 10, 3.6, '#fcd116');
    },
    SAC: function () {
      // Green over blue, divided by a gold band, with the Southern Cross on the blue.
      return rect(0, 0, 30, 20, '#0b7a43') + '<polygon points="0,20 0,12 30,4 30,20" fill="#123f8c"/>' +
        '<polygon points="0,12 30,4 30,6.2 0,14.2" fill="#f2c230"/>' +
        star(20, 9.6, 1.25, '#fff') + star(23.6, 12.6, 1.25, '#fff') + star(17.2, 13.4, 1.1, '#fff') + star(20.8, 16.8, 1.35, '#fff') + star(21.6, 13.6, 0.6, '#fff');
    },
    TUR: function () {
      return rect(0, 0, 30, 20, '#00afca') + rect(0, 0, 4, 20, '#e30a17') + crescent(15, 10, 4.2, '#fff', '#00afca', 1.1) + star(19.6, 10, 1.6, '#fff', Math.PI / 2);
    },
    GULF: function () {
      return hstripes(['#007a3d', '#fff', '#000']) + '<polygon points="0,0 9,10 0,20" fill="#ce1126"/>' + circle(3.6, 10, 1.7, '#f6c445') + circle(4.2, 10, 1.45, '#ce1126');
    },
    MESO: function () {
      var r = '';
      for (var i = 0; i < 12; i++) { var a = Math.PI * 2 * i / 12; r += '<line x1="' + (15 + Math.cos(a) * 2.3).toFixed(2) + '" y1="' + (10 + Math.sin(a) * 2.3).toFixed(2) + '" x2="' + (15 + Math.cos(a) * 3.6).toFixed(2) + '" y2="' + (10 + Math.sin(a) * 3.6).toFixed(2) + '" stroke="#c9972e" stroke-width="0.55" stroke-linecap="round"/>'; }
      return vstripes(['#006847', '#fff', '#ce1126']) + r + circle(15, 10, 2, '#e0aa3e') + circle(15, 10, 1.25, '#0f47af') + star(15, 10, 0.9, '#fff');
    },
    AUS: function () {
      return rect(0, 0, 30, 20, '#012169') + '<polygon points="0,0 8,10 0,20" fill="#ff8200"/>' +
        star(20, 5, 1.3, '#fff') + star(16.5, 9.5, 1.3, '#fff') + star(23.5, 9, 1.3, '#fff') + star(20, 15, 1.4, '#fff') + star(21.8, 11.3, 0.7, '#fff');
    },
    CAS: function () {
      // Blue, white and green with a Douglas fir.
      return hstripes(['#0b5ca8', '#fff', '#00843d']) +
        '<polygon points="15,2.3 17,6.6 16,6.6 18.2,10.6 16.8,10.6 19.4,15.2 15.6,15.2 15.6,17.6 14.4,17.6 14.4,15.2 10.6,15.2 13.2,10.6 11.8,10.6 14,6.6 13,6.6" fill="#3e2a1e"/>';
    },
    SIB: function () {
      return rect(0, 0, 30, 20, '#1e6b3a') + '<polygon points="0,20 0,13 30,0 30,7" fill="#fff"/>' + star(6, 5, 2.4, '#c8102e');
    },
    NRD: function () {
      // Deep blue Nordic cross: Swedish gold fimbriated in Danish/Norwegian white, on Finnish blue.
      return rect(0, 0, 30, 20, '#0b3d7a') + rect(8.4, 0, 4.6, 20, '#fff') + rect(0, 7.7, 30, 4.6, '#fff') +
        rect(9.3, 0, 2.8, 20, '#c8102e') + rect(0, 8.6, 30, 2.8, '#c8102e') +
        rect(10.05, 0, 1.3, 20, '#fecc00') + rect(0, 9.35, 30, 1.3, '#fecc00');
    },
    SGP: function () {
      return hstripes(['#ef3340', '#fff']) + crescent(6, 5, 3.2, '#fff', '#ef3340', 1.2) +
        star(9, 2.8, 0.6, '#fff') + star(10.8, 4.2, 0.6, '#fff') + star(10.1, 6.4, 0.6, '#fff') + star(7.9, 6.4, 0.6, '#fff') + star(7.2, 4.2, 0.6, '#fff');
    }
  };

  // Fallback for any nation without a designed flag: a tricolour in its own colour.
  function generic(n) {
    return hstripes([n.color || '#888', '#fff', n.color || '#888']) + star(15, 10, 2.6, n.color || '#888');
  }

  // Cloth shading: soft vertical folds plus a light sheen, so flags read as fabric, not clip art.
  var SHADE = '<defs><linearGradient id="flag-fold" x1="0" x2="1" y1="0" y2="0">' +
    '<stop offset="0" stop-color="#000" stop-opacity=".14"/><stop offset=".18" stop-color="#fff" stop-opacity=".06"/>' +
    '<stop offset=".42" stop-color="#000" stop-opacity=".06"/><stop offset=".66" stop-color="#fff" stop-opacity=".07"/>' +
    '<stop offset=".88" stop-color="#000" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>' +
    '<linearGradient id="flag-sheen" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".09"/>' +
    '<stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".1"/></linearGradient></defs>';
  var OVER = '<rect width="30" height="20" fill="url(#flag-fold)"/><rect width="30" height="20" fill="url(#flag-sheen)"/>' +
    '<rect x=".15" y=".15" width="29.7" height="19.7" fill="none" stroke="#000" stroke-opacity=".25" stroke-width=".3"/>';

  G.flags = {
    svg: function (n, cls) {
      var body = FLAGS[n.id] ? FLAGS[n.id]() : generic(n);
      return '<svg class="flag ' + (cls || '') + '" viewBox="0 0 30 20" preserveAspectRatio="none" aria-label="Flag of ' + n.name.replace(/"/g, '') + '">' + SHADE + body + OVER + '</svg>';
    }
  };
})();
