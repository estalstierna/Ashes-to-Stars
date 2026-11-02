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
      return hstripes(['#fff', '#0039a6', '#d52b1e']) + '<path d="M15 4.6 l3 1.6 v3.4 c0 2.4 -1.6 3.8 -3 4.6 c-1.4 -0.8 -3 -2.2 -3 -4.6 v-3.4z" fill="#d4af37" stroke="#7a5c00" stroke-width="0.3"/>' +
        '<path d="M15 6.3 l1.6 0.9 v2.1 c0 1.3 -0.8 2.1 -1.6 2.6 c-0.8 -0.5 -1.6 -1.3 -1.6 -2.6 v-2.1z" fill="#d52b1e"/>';
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
      var dots = '';
      [[13, 9.2], [15.6, 8.6], [17.4, 10.4], [14.2, 11.4], [16, 12.2], [12.8, 10.9], [15, 9.9]].forEach(function (p) { dots += circle(p[0], p[1], 0.35, '#fff'); });
      return rect(0, 0, 30, 20, '#009b3a') + '<polygon points="15,2.2 27,10 15,17.8 3,10" fill="#fedf00"/>' + circle(15, 10, 4.3, '#002776') +
        '<path d="M10.9 9.2 q4.1 -1.6 8.3 0.6" stroke="#fff" stroke-width="0.6" fill="none"/>' + dots;
    },
    TUR: function () {
      return rect(0, 0, 30, 20, '#00afca') + rect(0, 0, 4, 20, '#e30a17') + crescent(15, 10, 4.2, '#fff', '#00afca', 1.1) + star(19.6, 10, 1.6, '#fff', Math.PI / 2);
    },
    GULF: function () {
      return hstripes(['#007a3d', '#fff', '#000']) + '<polygon points="0,0 9,10 0,20" fill="#ce1126"/>' + circle(3.4, 10, 1.6, '#f6c445');
    },
    MESO: function () {
      return vstripes(['#006847', '#fff', '#ce1126']) + rect(10, 7.5, 10, 5, '#0f47af') + star(15, 10, 1.9, '#fff');
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
    SWE: function () {
      return rect(0, 0, 30, 20, '#006aa7') + rect(9, 0, 3.4, 20, '#fecc00') + rect(0, 8.3, 30, 3.4, '#fecc00');
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

  G.flags = {
    svg: function (n, cls) {
      var body = FLAGS[n.id] ? FLAGS[n.id]() : generic(n);
      return '<svg class="flag ' + (cls || '') + '" viewBox="0 0 30 20" preserveAspectRatio="none" aria-label="Flag of ' + n.name.replace(/"/g, '') + '">' + body + '</svg>';
    }
  };
})();
