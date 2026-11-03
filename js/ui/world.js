// World tab: interactive map, nation list, diplomacy view and nation details.
(function () {
  var K = G.uiKit, U = G.util, E = G.engine, D = G.data, A = G.actions, EV = G.events, M = G.military;
  var $ = K.$, S = K.S, esc = K.esc, modal = K.modal, closeModal = K.closeModal, toast = K.toast, bar = K.bar, stat = K.stat,
    rankStr = K.rankStr, wealthStr = K.wealthStr, on = K.on, keepScroll = K.keepScroll, signedMoney = K.signedMoney, pctS = K.pctS,
    SECTOR_LABELS = K.SECTOR_LABELS, PACT_NAMES = K.PACT_NAMES, showResult = K.showResult;
  function render() { K.render(); }
  function resumePending() { K.resumePending(); }

  // ---------- world map ----------
  var MAP = G.mapdata;
  var mapView = null, mapMode = 'political';

  // Follow annexations to find who controls a nation's original territory today.
  function ownerOf(id) {
    var n = E.nation(id), guard = 0;
    while (n && !n.alive && n.annexedBy && guard++ < 30) n = E.nation(n.annexedBy);
    return n && n.alive ? n : null;
  }
  function lighten(hex, t) {
    var c = parseInt(hex.slice(1), 16), r = c >> 16, g = (c >> 8) & 255, b = c & 255;
    function m(x) { return Math.round(x + (255 - x) * t); }
    return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')';
  }
  // Faint latitude/longitude lines and ocean names, drawn under the nations.
  function graticule() {
    var d = '';
    for (var lon = -150; lon <= 150; lon += 30) { var x = (lon + 180) / 360 * MAP.w; d += 'M' + x + ',0V' + MAP.h; }
    for (var lat = -60; lat <= 60; lat += 30) { var y = (90 - lat) / 180 * MAP.h; d += 'M0,' + y + 'H' + MAP.w; }
    var seas = [['Pacific Ocean', -145, 8], ['Pacific Ocean', 168, -18], ['Atlantic Ocean', -38, 24], ['Atlantic Ocean', -18, -22], ['Indian Ocean', 78, -24], ['Arctic Ocean', 10, 82], ['Southern Ocean', 40, -58]];
    return '<path class="graticule" d="' + d + '"/>' +
      '<path class="equator" d="M0,' + MAP.h / 2 + 'H' + MAP.w + '"/>' +
      seas.map(function (x) { return '<text class="sea-label" x="' + ((x[1] + 180) / 360 * MAP.w).toFixed(1) + '" y="' + ((90 - x[2]) / 180 * MAP.h).toFixed(1) + '">' + x[0] + '</text>'; }).join('');
  }
  function diploColor(n) {
    var me = E.pn();
    if (n === me) return '#4fc3f7';
    if (E.warBetween(me, n)) return '#ff3b30';
    var at = E.allianceType(me, n);
    if (at === 'alliance') return '#2dd4bf';
    if (at === 'defensive') return '#7cc6ff';
    var r = E.relation(me, n);
    return r > 30 ? '#4caf7d' : r > 0 ? '#a5c882' : r > -30 ? '#e3b341' : '#e5534b';
  }

  function mapHTML() {
    var me = E.pn(), s = S();
    var ash = ((100 - s.earth) / 100 * 0.55).toFixed(2);
    var op = mapMode === 'terrain' ? 0.1 : mapMode === 'diplomacy' ? 0.5 : 0.42;
    var regions = '', labels = '';
    // Provinces grouped by owner. The fill group is drawn opaque and faded as a whole,
    // so shared province edges do not show as seams; a second layer draws only outer borders.
    var byOwner = {};
    (s.prov || []).forEach(function (o, i) { if (o) (byOwner[o] = byOwner[o] || []).push(i); });
    var fills = '', lines = '', glow = '', landW = {};
    Object.keys(byOwner).forEach(function (oid) { landW[oid] = byOwner[oid].reduce(function (a, i) { return a + MAP.provinces[i].w; }, 0); });
    Object.keys(byOwner).forEach(function (oid) {
      var o = E.nation(oid);
      if (!o || !o.alive) return;
      var fill = mapMode === 'diplomacy' ? diploColor(o) : o.color;
      var war = o !== me && E.warBetween(me, o);
      var stroke = o === me ? '#f1d08f' : war ? '#ff6b5e' : lighten(fill, 0.35);
      var d = byOwner[oid].map(function (i) { return MAP.provinces[i].d; }).join('');
      fills += '<path data-nation="' + oid + '" d="' + d + '" fill="' + fill + '" stroke="' + fill + '" stroke-width="1.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>';
      // Outer border only: the edge filter keeps a thin band along the outside of the owner's whole area.
      var edge = '<g filter="url(#map-edge)" opacity="' + (o === me ? 1 : war ? 0.95 : 0.8) + '"><path d="' + d + '" fill="' + stroke + '" stroke="' + stroke + '" stroke-width="1.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></g>';
      lines += edge;
      // Your nation glows softly.
      if (o === me) glow = '<g class="me-glow" filter="url(#map-glow)">' + edge + '</g>';
    });
    // Front lines: provinces occupied in ongoing wars, striped in the occupier's colour.
    var occ = '', pats = {};
    (s.wars || []).forEach(function (w) {
      [['occA', w.a], ['occB', w.b]].forEach(function (x) {
        var list = w[x[0]] || [], o = E.nation(x[1]);
        if (!list.length || !o) return;
        pats[o.id] = o.color;
        occ += '<path d="' + list.map(function (i) { return MAP.provinces[i].d; }).join('') + '" fill="url(#occ-' + o.id + ')" stroke="' + o.color + '" stroke-width="1" stroke-dasharray="2 2" vector-effect="non-scaling-stroke"/>';
      });
    });
    var patDefs = Object.keys(pats).map(function (id) {
      return '<pattern id="occ-' + id + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="' + pats[id] + '" fill-opacity="0.75"/></pattern>';
    }).join('');
    regions = '<g opacity="' + op + '">' + fills + '</g><g pointer-events="none">' + glow + lines + '</g>' + (occ ? '<defs>' + patDefs + '</defs><g pointer-events="none">' + occ + '</g>' : '');
    // Label priority: you first, then by GDP (used to hide overlapping labels).
    E.alive().slice().sort(function (a, b) { return (b === me) - (a === me) || b.gdp - a.gdp; }).forEach(function (n, pri) {
      var p = G.territory.center(n.id);
      if (!p) return;
      var atWar = E.atWar(n);
      if (n.id === 'SGP') regions += '<circle data-nation="SGP" class="map-dot" cx="' + p[0] + '" cy="' + p[1] + '" r="3" fill="' + (mapMode === 'diplomacy' ? diploColor(n) : n.color) + '" stroke="#fff" stroke-width="1" vector-effect="non-scaling-stroke"/>';
            // Bigger countries get bigger names, like a printed atlas.
      var scale = U.clamp(0.8 + Math.sqrt(landW[n.id] || 0) / 42, 0.85, 1.55).toFixed(2);
      labels += '<text class="map-label' + (n === me ? ' me' : '') + (atWar ? ' atwar' : '') + '" style="font-size:calc(var(--fs, 12px) * ' + scale + ')" data-nation="' + n.id + '" data-pri="' + pri + '" x="' + p[0] + '" y="' + p[1] + '" dy="' + (n.id === 'SGP' ? '-1em' : 0) + '">' + esc(n.short) + '</text>';
    });
    // Conquered land away from the owner's own label gets its own name, e.g. "West China / USA-held".
    var nAlive = E.alive().length;
    G.territory.heldRegions().sort(function (a, b) { return b.w - a.w; }).forEach(function (r, i) {
      var o = E.nation(r.owner), orig = E.nation(r.orig);
      if (!o || !orig) return;
      var main, sub;
      if (r.dir) { main = r.dir + ' ' + orig.short; sub = o.short + '-held'; }
      else if (!orig.alive) { main = o.short; sub = 'former ' + orig.short; }
      else { main = orig.short; sub = o.short + '-held'; }
      labels += '<text class="map-label region' + (o === me ? ' me' : '') + '" data-nation="' + o.id + '" data-pri="' + (nAlive + i) + '" x="' + r.at[0] + '" y="' + r.at[1] + '">' +
        '<tspan x="' + r.at[0] + '" dy="-0.45em">' + esc(main) + '</tspan><tspan class="sub" x="' + r.at[0] + '" dy="1.15em">' + esc(sub) + '</tspan></text>';
    });
    return '<div class="map-wrap" id="map-wrap">' +
      '<svg id="world-map" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' +
      '<defs><filter id="map-edge" x="-5%" y="-5%" width="110%" height="110%"><feMorphology id="map-erode" in="SourceAlpha" operator="erode" radius="1"/>' +
      '<feComposite in="SourceGraphic" operator="out"/></filter>' +
      '<filter id="map-glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>' +
      '<rect x="-2000" y="-2000" width="5000" height="4500" fill="#06101f"/>' +
      '<image class="map-earth" href="img/earth.jpg" x="0" y="0" width="' + MAP.w + '" height="' + MAP.h + '" preserveAspectRatio="none"/>' +
      '<g pointer-events="none">' + graticule() + '</g>' +
      '<rect x="0" y="0" width="' + MAP.w + '" height="' + MAP.h + '" fill="#3a2f26" opacity="' + ash + '"/>' +
      '<path d="' + MAP.unclaimed + '" fill="#000" fill-opacity="0.15" stroke="#9aa4b2" stroke-opacity="0.35" stroke-width="0.6" vector-effect="non-scaling-stroke"/>' +
      '<g id="map-regions">' + regions + '</g><g id="map-labels">' + labels + '</g></svg>' +
      '<div class="map-zoom"><button data-act="mapzoom" data-arg="in">+</button><button data-act="mapzoom" data-arg="out">−</button><button data-act="mapzoom" data-arg="home" aria-label="Recentre">' + K.icon('target') + '</button></div>' +
      '</div>' +
      '<div class="seg map-modes">' + [['political', 'Nations'], ['terrain', 'Terrain'], ['diplomacy', 'Diplomacy']].map(function (m) {
        return '<button class="' + (mapMode === m[0] ? 'sel' : '') + '" data-act="mapmode" data-arg="' + m[0] + '">' + m[1] + '</button>';
      }).join('') + '</div>' +
      (mapMode === 'diplomacy' ? '<div class="small muted map-legend"><span style="color:#4fc3f7">■</span> You <span style="color:#2dd4bf">■</span> Ally <span style="color:#7cc6ff">■</span> Defensive pact <span style="color:#4caf7d">■</span> Friendly <span style="color:#a5c882">■</span> Warm <span style="color:#e3b341">■</span> Cool <span style="color:#e5534b">■</span> Hostile <span style="color:#ff3b30">■</span> At war</div>' :
        '<div class="small muted map-legend">Drag to move, pinch or use +/− to zoom. Tap a nation for details.' + (s.earth < 60 ? ' The brown haze is war damage; heal the Earth to clear it.' : '') + '</div>');
  }

  function initMap() {
    var svg = $('world-map'), wrap = $('map-wrap');
    if (!svg) return;
    var cw = wrap.clientWidth, ch = wrap.clientHeight;
    var aspect = ch / cw;
    if (!mapView) {
      // Start zoomed in around the player's nation.
      var c = MAP.labels[E.pn().id] || [500, 250];
      mapView = { cx: c[0], cy: c[1], w: 420 };
    }
    function apply() {
      var w = U.clamp(mapView.w, 40, MAP.w * 1.05), h = w * aspect;
      mapView.w = w;
      mapView.cx = U.clamp(mapView.cx, w / 2 - 20, MAP.w - w / 2 + 20);
      mapView.cy = h >= 420 ? 240 : U.clamp(mapView.cy, 15 + h / 2, 470 - h / 2);
      svg.setAttribute('viewBox', (mapView.cx - w / 2) + ' ' + (mapView.cy - h / 2) + ' ' + w + ' ' + h);
      svg.classList.toggle('far', w > 470);
      // Keep label text the same size on screen at every zoom level.
      var k = w / cw, px = w > 450 ? 12 - Math.min(1, (w - 450) / 550) * 2.5 : 12;
      svg.style.setProperty('--fs', (px * k) + 'px');
      svg.style.setProperty('--sw', (3 * k) + 'px');
      var dots = svg.querySelectorAll('.map-dot');
      for (var i = 0; i < dots.length; i++) dots[i].setAttribute('r', 5 * k);
      // Border thickness in map units, so it stays ~1.2px on screen at every zoom.
      var er = document.getElementById('map-erode');
      if (er) er.setAttribute('radius', (1.2 * k).toFixed(3));
      declutter(k);
    }
    apply();
    mapApply = apply;

    var pts = {}, start = null, moved = 0;
    function toUnits(dx) { return dx * mapView.w / wrap.clientWidth; }
    svg.addEventListener('pointerdown', function (e) {
      svg.setPointerCapture(e.pointerId);
      pts[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (Object.keys(pts).length === 1) { start = { x: e.clientX, y: e.clientY, t: Date.now(), target: e.target }; moved = 0; }
      else moved = 99; // multi-touch is never a tap
    });
    svg.addEventListener('pointermove', function (e) {
      var p = pts[e.pointerId];
      if (!p) return;
      var ids = Object.keys(pts);
      if (ids.length === 1) {
        var dx = e.clientX - p.x, dy = e.clientY - p.y;
        moved += Math.abs(dx) + Math.abs(dy);
        mapView.cx -= toUnits(dx); mapView.cy -= toUnits(dy);
      } else if (ids.length === 2) {
        var other = pts[ids[0] === String(e.pointerId) ? ids[1] : ids[0]];
        var before = Math.hypot(p.x - other.x, p.y - other.y);
        var after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        if (before > 0 && after > 0) zoomAt(before / after, (e.clientX + other.x) / 2, (e.clientY + other.y) / 2);
      }
      p.x = e.clientX; p.y = e.clientY;
      apply();
    });
    function end(e) {
      var wasTap = start && Object.keys(pts).length === 1 && moved < 8 && Date.now() - start.t < 600;
      delete pts[e.pointerId];
      if (wasTap && e.type === 'pointerup') {
        var el = document.elementFromPoint(e.clientX, e.clientY);
        var hit = el && el.closest && el.closest('[data-nation]');
        if (hit) K.handlers.nation(hit.getAttribute('data-nation'));
      }
      if (!Object.keys(pts).length) start = null;
    }
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
    svg.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoomAt(e.deltaY > 0 ? 1.15 : 1 / 1.15, e.clientX, e.clientY);
      apply();
    }, { passive: false });
    function zoomAt(f, clientX, clientY) {
      var r = wrap.getBoundingClientRect();
      var fx = (clientX - r.left) / r.width - 0.5, fy = (clientY - r.top) / r.height - 0.5;
      var w0 = mapView.w, w1 = U.clamp(w0 * f, 40, MAP.w * 1.05);
      var h0 = w0 * aspect, h1 = w1 * aspect;
      mapView.cx += fx * (w0 - w1); mapView.cy += fy * (h0 - h1);
      mapView.w = w1;
    }
  }
  var mapApply = null;
  // Hide labels that would overlap a more important one.
  function declutter(k) {
    var labels = Array.prototype.slice.call(document.querySelectorAll('#world-map .map-label'));
    labels.sort(function (a, b) { return a.getAttribute('data-pri') - b.getAttribute('data-pri'); });
    var shown = [], pad = 2 * k;
    labels.forEach(function (t) {
      t.style.display = '';
      var b;
      try { b = t.getBBox(); } catch (e) { return; }
      var hit = shown.some(function (o) {
        return b.x < o.x + o.width + pad && o.x < b.x + b.width + pad && b.y < o.y + o.height && o.y < b.y + b.height;
      });
      if (hit) t.style.display = 'none'; else shown.push(b);
    });
  }
  on('mapzoom', function (a) {
    if (!mapView) return;
    if (a === 'in') mapView.w /= 1.5;
    else if (a === 'out') mapView.w *= 1.5;
    else { var c = MAP.labels[E.pn().id] || [500, 250]; mapView = { cx: c[0], cy: c[1], w: 420 }; }
    if (mapApply) mapApply();
  });
  on('mapmode', function (m) { mapMode = m; keepScroll(render); });

  on('worldview', function (v) { K.view.world = v; keepScroll(render); });

  function diplomacyView() {
    var me = E.pn(), s = S(), lead = E.isLeader(), h = '';
    var others = E.alive().filter(function (x) { return x !== me; });
    // Threat / aggressive expansion
    var th = me.threat || 0;
    h += '<div class="card"><div class="row"><h3 style="margin:0">How the world sees you</h3><b class="' + (th >= 45 ? 'bad' : th >= 20 ? 'warn' : 'good') + '">' + E.threatLevel(me) + ' threat (' + Math.round(th) + ')</b></div>' + bar(Math.min(100, th), th >= 45 ? 'bad' : th >= 20 ? 'warn' : 'good') +
      '<div class="small muted">Starting wars, taking land and annexing nations frighten the world. ' +
      (th >= 45 ? '<span class="bad">Nations are forming defensive pacts against you, and some will join your victims in a coalition if you attack again.</span> ' : th >= 20 ? '<span class="warn">Relations with everyone are slowly souring.</span> ' : '') +
      'Fear fades over time in peace.</div></div>';
    var feared = others.filter(function (x) { return (x.threat || 0) >= 30; });
    if (feared.length) h += '<div class="card"><h3>Feared aggressors</h3>' + feared.map(function (x) {
      return '<div class="row small" style="padding:4px 0"><span><span class="dot" style="background:' + x.color + '"></span>' + esc(x.short) + '</span><span class="' + ((x.threat || 0) >= 45 ? 'bad' : 'warn') + '">' + E.threatLevel(x) + ' (' + Math.round(x.threat) + ')</span></div>';
    }).join('') + '</div>';

    // Your treaties
    var mine = others.map(function (x) {
      var ps = s.pacts.filter(function (p) { return (p.a === me.id && p.b === x.id) || (p.b === me.id && p.a === x.id); });
      return { n: x, ps: ps };
    }).filter(function (r) { return r.ps.length; }).sort(function (a, b) { return E.relation(me, b.n) - E.relation(me, a.n); });
    h += '<div class="card"><h3>Your treaties</h3>' + (mine.length ? mine.map(function (r) {
      return '<button class="nation-row" data-act="nation" data-arg="' + r.n.id + '" style="margin-bottom:6px"><div class="row"><b><span class="dot" style="background:' + r.n.color + '"></span>' + esc(r.n.short) + '</b><span class="tag">' + (E.relation(me, r.n) > 0 ? '+' : '') + Math.round(E.relation(me, r.n)) + '</span></div>' +
        '<div class="meta">' + r.ps.map(function (p) { return PACT_NAMES[p.type] + (p.until < 99999 ? ' (until ' + p.until + ')' : ''); }).join(' · ') + '</div></button>';
    }).join('') : '<div class="small muted">No treaties yet.' + (lead ? ' Tap a nation (here or on the map) to propose one.' : '') + '</div>') + '</div>';

    // Who would defend you?
    var allies = E.allies(me);
    var threat = others.filter(function (x) { return !E.allied(me, x); }).sort(function (a, b) { return E.relation(me, a) - E.relation(me, b) || E.power(b) - E.power(a); })[0];
    if (allies.length && threat) {
      h += '<div class="card"><h3>If ' + esc(threat.short) + ' attacked you today</h3><div class="small muted" style="margin-bottom:8px">Your most hostile rival (relations ' + Math.round(E.relation(me, threat)) + ', power ' + U.num(E.power(threat)) + '). Chance that each partner would fight at your side:</div>' +
        allies.map(function (a) {
          var c = E.joinChance(a, me, threat, true);
          return '<div class="row small"><span>' + PACT_NAMES[E.allianceType(me, a)] + ' · ' + esc(a.short) + '</span><b>' + Math.round(c * 100) + '%</b></div>' + bar(c * 100);
        }).join('') + '<div class="small muted">Higher with better relations, if they dislike the attacker, and if together you can win. Lower if they are busy in other wars or have a pact with the attacker.</div></div>';
    }

    // World Council
    var CO = G.council, c = CO.C(), lead = E.isLeader();
    h += '<div class="card"><h3>World Council</h3>';
    if (c.pending) {
      var t = CO.tally(c.pending);
      h += '<div class="small muted">Vote in ' + Math.max(1, c.pending.year + 1 - s.year) + ' year' + (c.pending.year + 1 - s.year > 1 ? 's' : '') + (c.pending.by ? ' · tabled by ' + esc(E.nation(c.pending.by).short) : '') + '</div>' +
        '<div style="font-weight:600;margin:4px 0">' + esc(CO.title(c.pending)) + '</div><div class="small muted" style="margin-bottom:8px">' + esc(CO.desc(c.pending)) + '</div>' +
        '<div class="row small"><span class="good">For ' + t.yes.length + '</span><span class="muted">Abstain ' + t.abstain.length + '</span><span class="bad">Against ' + t.no.length + '</span></div>' +
        bar(t.wYes / Math.max(1, t.wYes + t.wNo) * 100, t.passes ? 'good' : 'bad') +
        '<div class="small muted">Forecast: <b class="' + (t.passes ? 'good' : 'bad') + '">' + (t.passes ? 'passes' : 'fails') + '</b> (votes weighted by economic size). ' +
        'For: ' + t.yes.map(function (x) { return esc(x.short); }).join(', ') + (t.no.length ? '. Against: ' + t.no.map(function (x) { return esc(x.short); }).join(', ') : '') + '.</div>' +
        (lead ? '<button class="btn sm blue" style="margin-top:8px" data-act="doaction" data-arg="council-lobby">Lobby</button>' : '');
    } else {
      h += '<div class="small muted">No resolution on the table. The next one is expected around ' + c.next + '.</div>' +
        (lead ? '<button class="btn sm blue" style="margin-top:8px" data-act="doaction" data-arg="council-propose">Table a resolution</button>' : '');
    }
    var act = c.active.filter(function (x) { return x.until > s.year; });
    if (act.length) h += '<h3 style="margin-top:12px">In force</h3>' + act.map(function (x) { return '<div class="row small" style="padding:3px 0"><span>' + esc(x.title) + '</span><span class="muted">' + (x.until - s.year) + ' yr left</span></div>'; }).join('');
    if (c.history.length) h += '<h3 style="margin-top:12px">Past votes</h3>' + c.history.slice(0, 5).map(function (x) { return '<div class="row small" style="padding:3px 0"><span>' + x.y + ' · ' + esc(x.title) + '</span><span class="' + (x.passed ? 'good' : 'bad') + '">' + (x.passed ? 'Passed' : 'Failed') + '</span></div>'; }).join('');
    h += '</div>';

    // Intelligence
    var I = G.intel;
    h += '<div class="card"><h3>Intelligence</h3><div class="grid2">' + stat('Your agency', Math.round(I.ensure(me)) + ' / 100') +
      stat('Counter-intelligence', I.counter(me) ? '<span class="good">Active until ' + me.counter + '</span>' : '<span class="muted">Off</span>') + '</div>' +
      '<div class="small muted" style="margin:8px 0 4px">Strongest agencies</div>' +
      E.alive().slice().sort(function (a, b) { return I.ensure(b) - I.ensure(a); }).slice(0, 5).map(function (x) {
        return '<div class="row small" style="padding:2px 0"><span>' + G.flags.svg(x, 'mini') + esc(x.short) + '</span><b>' + Math.round(I.ensure(x)) + '</b></div>';
      }).join('') +
      ((s.intelLog || []).length ? '<div class="small muted" style="margin:10px 0 4px">Recent operations</div>' + s.intelLog.slice(0, 6).map(function (x) { return '<div class="small" style="padding:2px 0">' + x.y + ' · ' + esc(x.t) + '</div>'; }).join('') : '') +
      '<div class="small muted" style="margin-top:8px">Run operations from the Actions tab or from a nation\'s page. Success depends on your agency against theirs and on the support of your intelligence services.</div></div>';

    // Treaty types
    h += '<div class="card"><h3>Treaty types</h3>' +
      '<div class="small" style="margin-bottom:8px"><b>🕊️ Non-aggression pact</b>: neither side attacks the other (lasts 15 years). Also signed automatically after a peace treaty.</div>' +
      '<div class="small" style="margin-bottom:8px"><b>🛡️ Defensive pact</b>: if one of you is attacked, the other is expected to help. Never covers wars you start. Refusing to help breaks the pact.</div>' +
      '<div class="small" style="margin-bottom:8px"><b>🤝 Alliance</b>: defend each other (more reliably) <i>and</i> your ally may join wars you start, or ask you to join theirs. Declining an attack only cools relations.</div>' +
      '<div class="small"><b>📦 Trade agreement</b>: +0.6% growth for both sides for 10 years.</div></div>';

    // World alliances
    var blocs = s.pacts.filter(function (p) { return (p.type === 'alliance' || p.type === 'defensive') && E.nation(p.a).alive && E.nation(p.b).alive; });
    h += '<div class="card"><h3>Alliances of the world</h3>' + (blocs.length ? blocs.sort(function (a, b) { return a.type < b.type ? -1 : 1; }).map(function (p) {
      var A = E.nation(p.a), B = E.nation(p.b);
      return '<div class="row small" style="padding:4px 0"><span><span class="dot" style="background:' + A.color + '"></span>' + esc(A.short) + ' ⇄ <span class="dot" style="background:' + B.color + '"></span>' + esc(B.short) + '</span><span class="muted">' + PACT_NAMES[p.type] + '</span></div>';
    }).join('') : '<div class="small muted">No alliances right now.</div>') + '</div>';
    return h;
  }

  function worldTab() {
    var me = E.pn();
    var seg = '<div class="seg" style="margin-bottom:12px">' + [['map', '🗺️ Map & nations'], ['diplo', '🤝 Diplomacy']].map(function (x) {
      return '<button class="' + (K.view.world === x[0] ? 'sel' : '') + '" data-act="worldview" data-arg="' + x[0] + '">' + x[1] + '</button>';
    }).join('') + '</div>';
    if (K.view.world === 'diplo') return seg + diplomacyView();
    var list = E.alive().slice().sort(function (a, b) { return b.gdp - a.gdp; });
    var h = seg + '<h3>World map</h3>' + mapHTML() +
      '<h3 style="margin-top:18px">Nations of the world</h3><p class="small muted">Sorted by GDP. Tap a nation for details.</p>';
    list.forEach(function (n) {
      var w = me !== n && E.warBetween(me, n), rel = me !== n ? Math.round(E.relation(me, n)) : null;
      h += '<button class="nation-row ' + (n === me ? 'me' : '') + '" data-act="nation" data-arg="' + n.id + '">' +
        '<div class="row"><div>' + G.flags.svg(n, 'mini') + '<b>' + esc(n.name) + '</b></div>' +
        '<div>' + (w ? '<span class="tag war">' + (w.independence ? 'UPRISING' : 'WAR') + '</span>' : '') + (n.born && S().year - n.born < 15 ? '<span class="tag">NEW STATE</span>' : '') + (me !== n && E.allied(me, n) ? '<span class="tag pact">' + (E.allianceType(me, n) === 'alliance' ? 'ALLY' : 'DEF. PACT') + '</span>' : '') + (rel !== null ? '<span class="tag ' + (rel > 20 ? 'pact' : rel < -30 ? 'war' : '') + '">' + (rel > 0 ? '+' : '') + rel + '</span>' : '<span class="tag">YOU</span>') + '</div></div>' +
        '<div class="meta">' + E.gov(n).name + ' · Pop ' + U.people(n.pop) + ' · GDP ' + U.money(n.gdp) + ' · Mil ' + U.num(E.power(n)) + ' · 🚀 ' + D.milestones[E.milestoneIndex(n)].name + '</div></button>';
    });
    var dead = Object.keys(S().nations).map(E.nation).filter(function (n) { return !n.alive; });
    if (dead.length) h += '<p class="small muted">Fallen nations: ' + dead.map(function (n) { return esc(n.name); }).join(', ') + '</p>';
    return h;
  }
  // Everything we know about a nation's past: founding, pre-2077 events and the game's chronicle.
  function historyHTML(n) {
    var L = G.lore[n.id] || {}, items = [];
    (L.past || []).forEach(function (p) { items.push({ y: p[0], t: p[1] }); });
    // The founding year is a timeline entry like any other, unless the backstory already marks that year.
    if (L.founded && !(L.past || []).some(function (p) { return p[0] === L.founded; })) items.push({ y: L.founded, t: 'Founded' });
    (n.chron || []).forEach(function (c) { items.push({ y: c.y, t: c.t }); });
    items.forEach(function (c, i) { c._i = i; });
    items.sort(function (a, b) { return b.y - a.y || b._i - a._i; });
    var h = L.story ? '<p class="small" style="line-height:1.5;margin-top:12px">' + esc(L.story) + '</p>' : '';
    h += '<h3 style="margin-top:14px">Timeline</h3>';
    if (!items.length) return h + '<p class="small muted">Nothing recorded yet.</p>';
    return h + '<div class="timeline">' + items.map(function (c) {
      return '<div class="tl-row' + (c.y < 2077 ? ' past' : '') + '"><span class="tl-year">' + c.y + '</span><span class="tl-text">' + esc(c.t) + '</span></div>';
    }).join('') + '</div>';
  }

  on('nation', function (arg) {
    var parts = String(arg).split('|'), id = parts[0], tab = parts[1] || 'info';
    var n = E.nation(id), me = E.pn(), self = n === me, L = G.lore[n.id] || {};
    var wars = E.warsOf(n).map(function (w) { return E.nation(w.a === n.id ? w.b : w.a).short; });
    var pacts = S().pacts.filter(function (p) { return p.a === n.id || p.b === n.id; }).map(function (p) { return (PACT_NAMES[p.type] || p.type) + ' with ' + E.nation(p.a === n.id ? p.b : p.a).short; });
    var gdpRank = E.alive().slice().sort(function (a, b) { return b.gdp - a.gdp; }).indexOf(n) + 1;
    var html = '<div class="flag-hero">' + G.flags.svg(n) + '</div>' +
      '<div class="kicker">' + esc(n.tier) + (n.alive ? ' · #' + gdpRank + ' economy' : ' · fallen') + '</div><h2 style="margin-bottom:2px">' + esc(n.name) + '</h2>' +
      (L.motto ? '<p class="small muted" style="margin:0 0 8px;font-style:italic">“' + esc(L.motto) + '”</p>' : '') +
      '<div class="seg" style="margin:8px 0 12px">' + [['info', 'Overview'], ['history', 'History']].map(function (x) {
        return '<button class="' + (tab === x[0] ? 'sel' : '') + '" data-act="nation" data-arg="' + n.id + '|' + x[0] + '">' + x[1] + '</button>';
      }).join('') + '</div>';
    if (tab === 'history') {
      html += '<div class="grid2">' + stat('Capital', esc(L.capital || '—')) + stat('Founded', L.founded || (n.born || '—')) +
        stat('Wars fought', n.warsFought || 0) + stat(E.title(n), esc(E.leaderName(n) || '—')) + '</div>' + historyHTML(n);
      html += '<button class="btn" data-act="close">Close</button>';
      modal(html);
      return;
    }
    html += '<p class="muted small">' + esc(n.desc) + '</p>' +
      '<div class="grid2">' + stat('Government', E.gov(n).name) + stat('Leader', n.leader ? esc(n.leader.name) : esc(S().player.name)) +
      stat('Population', U.people(n.pop)) + stat('GDP', U.money(n.gdp)) + stat('Military', U.num(E.power(n))) + stat('Tech', n.tech.toFixed(1)) +
      stat('Stability', Math.round(n.stability)) + stat('Space', D.milestones[E.milestoneIndex(n)].name) +
      K.treasuryStat(n) + stat('Tax take', Math.round(n.tax * 100) + '% of GDP') + '</div>' +
      '<p class="small" style="margin-top:10px">' + (wars.length ? '⚔️ At war with ' + wars.join(', ') : 'At peace') + '</p>' +
      (pacts.length ? '<p class="small">🤝 ' + pacts.join(' · ') + '</p>' : '') +
      (function () {
        var by = (S().sanctions || []).filter(function (x) { return x.target === n.id && x.until > S().year; }).map(function (x) { return E.nation(x.by).short; });
        if (G.council.C().active.some(function (x) { return x.type === 'sanctions' && x.target === n.id && x.until > S().year; })) by.unshift('the World Council');
        return by.length ? '<p class="small bad">🚫 Under sanctions by ' + by.join(', ') + '</p>' : '';
      })() +
      (!self ? '<p class="small">Relations with you: <b>' + Math.round(E.relation(me, n)) + '</b> · Neighbour: ' + (me.neighbors.indexOf(n.id) >= 0 ? 'yes' : 'no') + '</p>' : '');
    if (!self && E.isLeader()) {
      var dip = [['envoy', 'Send envoys'], ['trade', 'Trade agreement'], ['nap', 'Non-aggression pact'], ['defpact', 'Propose defensive pact'],
        ['alliance', E.allianceType(me, n) === 'defensive' ? 'Upgrade to full alliance' : 'Propose full alliance'], ['breakally', 'Cancel alliance / pact'], ['sanction', 'Impose sanctions'], ['tribute', 'Demand tribute'], ['war', 'Declare war'], ['offensive', 'Major offensive'], ['peace', 'Propose peace']];
      ['steal', 'sabotage', 'military', 'unrest', 'coup'].forEach(function (op) { dip.push(['spy-' + op, '🕵 ' + G.intel.OPS[op].name + ' (' + Math.round(G.intel.chance(me, n, op) * 100) + '%)']); });
      var avail = A.available();
      dip.forEach(function (d) {
        var a = avail.filter(function (x) { return x.id === d[0]; })[0];
        if (!a) return;
        var ts = A.targets(a) || [];
        if (!ts.some(function (t) { return t.id === n.id; })) return;
        var can = A.affordable(a) && S().ap > 0 && S().used.indexOf(a.id) < 0;
        html += '<button class="btn ' + (d[0] === 'war' ? 'danger' : '') + '" data-act="target" data-arg="' + a.id + '|' + n.id + '" ' + (can ? '' : 'disabled') + '>' + d[1] + ' · ' + (A.costFor(a) ? U.money(A.costFor(a)) : 'free') + '</button>';
      });
    }
    html += '<button class="btn" data-act="close">Close</button>';
    modal(html);
  });


  K.tabs.world = { render: worldTab, after: function () { if (K.view.world === 'map') initMap(); } };
})();
