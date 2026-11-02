// Builds js/mapdata.js: one SVG path per game nation in an equirectangular projection
// (1000 x 500), matching the img/earth.jpg texture.
// Needs: npm i world-atlas@2.0.2 topojson-client@3.1.0 polygon-clipping@0.15.7
// Run:   NODE_PATH=<dir with node_modules> node tools/build-map.js
const fs = require('fs');
const path = require('path');
const topo = require('world-atlas/countries-110m.json');
const { feature } = require('topojson-client');
const pc = require('polygon-clipping');

const W = 1000, H = 500;

// Real-world countries -> nations of 2077 (fiction).
const ASSIGN = {
  USA: ['United States of America', 'Puerto Rico'],
  EF: ['Albania', 'Austria', 'Belgium', 'Bosnia and Herz.', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Estonia',
    'France', 'Germany', 'Greece', 'Greenland', 'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kosovo', 'Latvia', 'Lithuania',
    'Luxembourg', 'Macedonia', 'Moldova', 'Montenegro', 'Netherlands', 'Poland', 'Portugal', 'Romania', 'Serbia', 'Slovakia',
    'Slovenia', 'Spain', 'Switzerland', 'Ukraine', 'United Kingdom'],
  NRD: ['Sweden', 'Norway', 'Denmark', 'Finland'],
  RUS: ['Belarus'],
  CHN: ['China', 'Taiwan', 'Mongolia', 'Vietnam', 'Laos', 'Cambodia', 'Myanmar', 'Thailand'],
  IND: ['India', 'Pakistan', 'Bangladesh', 'Nepal', 'Bhutan', 'Sri Lanka'],
  PAC: ['Japan', 'South Korea', 'North Korea', 'Philippines'],
  TUR: ['Turkey', 'N. Cyprus', 'Azerbaijan', 'Armenia', 'Georgia', 'Kazakhstan', 'Uzbekistan', 'Turkmenistan', 'Kyrgyzstan', 'Tajikistan', 'Iran', 'Afghanistan'],
  GULF: ['Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Oman', 'Yemen', 'Iraq', 'Syria', 'Jordan'],
  PAU: ['Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon', 'Central African Rep.', 'Chad', 'Congo',
    "Côte d'Ivoire", 'Dem. Rep. Congo', 'Djibouti', 'Egypt', 'Eq. Guinea', 'Eritrea', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea',
    'Guinea-Bissau', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Morocco', 'Mozambique',
    'Namibia', 'Niger', 'Nigeria', 'Rwanda', 'S. Sudan', 'Senegal', 'Sierra Leone', 'Somalia', 'Somaliland', 'South Africa', 'Sudan',
    'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'W. Sahara', 'Zambia', 'Zimbabwe', 'eSwatini'],
  SAC: ['Argentina', 'Bolivia', 'Brazil', 'Chile', 'Colombia', 'Ecuador', 'Falkland Is.', 'Guyana', 'Paraguay', 'Peru', 'Suriname',
    'Uruguay', 'Venezuela', 'Trinidad and Tobago'],
  MESO: ['Mexico', 'Belize', 'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panama', 'Cuba', 'Haiti',
    'Dominican Rep.', 'Jamaica', 'Bahamas'],
  AUS: ['Australia', 'New Zealand', 'Indonesia', 'Malaysia', 'Brunei', 'Papua New Guinea', 'Timor-Leste', 'Fiji', 'Vanuatu',
    'Solomon Is.', 'New Caledonia'],
  _none: ['Antarctica', 'Fr. S. Antarctic Lands', 'Israel', 'Palestine', 'Lebanon']
};

// Label anchors (lon, lat) and Singapore marker.
const LABELS = {
  USA: [-99, 40], CAS: [-123, 52], EF: [12, 49], NRD: [17, 64], RUS: [40, 56], SIB: [105, 63], CHN: [104, 33], IND: [79, 22],
  PAC: [136, 37], TUR: [62, 41], GULF: [46, 24], PAU: [20, 4], SAC: [-58, -12], MESO: [-100, 21], AUS: [134, -25], SGP: [103.8, 1.35]
};

function box(lon0, lat0, lon1, lat1) { return [[[lon0, lat0], [lon1, lat0], [lon1, lat1], [lon0, lat1], [lon0, lat0]]]; }
function coords(f) { return f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates; }

// Polygons that cross the antimeridian (Alaska, Chukotka, Fiji) come with rings that jump
// from +180 to -180. Unwrap them into continuous longitudes, then cut back into the -180..180 world.
const WORLD = box(-180, -90, 180, 90);
function crosses(ring) { return ring.some((p, i) => i && Math.abs(p[0] - ring[i - 1][0]) > 180); }
function unwrap(ring) {
  let off = 0;
  return ring.map((p, i) => {
    if (i) { const d = p[0] - ring[i - 1][0]; if (d > 180) off -= 360; else if (d < -180) off += 360; }
    return [p[0] + off, p[1]];
  });
}
function fixAntimeridian(mp) {
  let out = [];
  for (const poly of mp) {
    if (!poly.some(crosses)) { out.push(poly); continue; }
    const u = poly.map(unwrap);
    for (const shift of [-360, 0, 360]) {
      const moved = u.map(r => r.map(p => [p[0] + shift, p[1]]));
      out = out.concat(pc.intersection([moved], WORLD));
    }
  }
  return pc.union(out.length ? out : [], []);
}

const feats = feature(topo, topo.objects.countries).features;
const byName = {};
feats.forEach(f => { byName[f.properties.name] = fixAntimeridian(coords(f)); });

// ---------- 1. assign real countries to 2077 nations ----------
const used = new Set();
const pieces = []; // { n: nation id, mp: multipolygon }
let unclaimed = [];
for (const id in ASSIGN) for (const name of ASSIGN[id]) {
  if (!byName[name]) throw new Error('Unknown country ' + name);
  used.add(name);
  if (id === '_none') unclaimed = pc.union(unclaimed, byName[name]);
  else if (name !== 'United States of America') pieces.push({ n: id, mp: byName[name] });
}
// Russia: west of the Urals stays Russian, the east is the Siberian Free Republic.
used.add('Russia');
const urals = box(0, 30, 60, 85);
pieces.push({ n: 'RUS', mp: pc.intersection(byName.Russia, urals) });
pieces.push({ n: 'SIB', mp: pc.difference(byName.Russia, urals) });
// Cascadia: the US Pacific Northwest + western Canada. The rest of Canada joined the USA.
used.add('Canada');
const pnw = box(-125.5, 42, -116.5, 49.5), wcan = box(-141, 48, -114, 70);
const usa = byName['United States of America'];
pieces.push({ n: 'CAS', mp: pc.intersection(usa, pnw) });
pieces.push({ n: 'CAS', mp: pc.intersection(byName.Canada, wcan) });
pieces.push({ n: 'USA', mp: pc.difference(usa, pnw) });
pieces.push({ n: 'USA', mp: pc.difference(byName.Canada, wcan) });

const missing = Object.keys(byName).filter(n => !used.has(n));
if (missing.length) throw new Error('Unassigned: ' + missing.join(', '));

// ---------- 2. split big countries into provinces on a 10-degree grid ----------
function ringArea(r) { let a = 0; for (let i = 0; i < r.length - 1; i++) a += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]; return a / 2; }
function area(mp) { return mp.reduce((s, poly) => s + Math.abs(ringArea(poly[0])) - poly.slice(1).reduce((h, r) => h + Math.abs(ringArea(r)), 0), 0); }
function centroid(mp) {
  let A = 0, X = 0, Y = 0;
  mp.forEach(poly => {
    const r = poly[0];
    for (let i = 0; i < r.length - 1; i++) {
      const f = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
      A += f; X += (r[i][0] + r[i + 1][0]) * f; Y += (r[i][1] + r[i + 1][1]) * f;
    }
  });
  if (Math.abs(A) < 1e-9) { const p = mp[0][0][0]; return p; }
  return [X / (3 * A), Y / (3 * A)];
}
function bbox(mp) {
  let b = [180, 90, -180, -90];
  mp.forEach(poly => poly[0].forEach(p => { b[0] = Math.min(b[0], p[0]); b[1] = Math.min(b[1], p[1]); b[2] = Math.max(b[2], p[0]); b[3] = Math.max(b[3], p[1]); }));
  return b;
}
const CELL = 8, SPLIT_AREA = 60, SLIVER = 8;
const provinces = [];
pieces.forEach(pc0 => {
  if (!pc0.mp.length) return;
  if (area(pc0.mp) <= SPLIT_AREA) { provinces.push({ n: pc0.n, mp: pc0.mp }); return; }
  const b = bbox(pc0.mp), cells = [];
  for (let x = Math.floor(b[0] / CELL) * CELL; x < b[2]; x += CELL)
    for (let y = Math.floor(b[1] / CELL) * CELL; y < b[3]; y += CELL) {
      const part = pc.intersection(pc0.mp, box(x, y, x + CELL, y + CELL));
      if (part.length) cells.push({ n: pc0.n, mp: part, a: area(part), c: centroid(part) });
    }
  // Merge tiny slivers into the nearest proper cell of the same country.
  const big = cells.filter(c => c.a >= SLIVER), small = cells.filter(c => c.a < SLIVER);
  if (!big.length) { provinces.push({ n: pc0.n, mp: pc0.mp }); return; }
  small.forEach(sc => {
    let best = big[0], bd = 1e9;
    big.forEach(bc => { const d = Math.hypot(bc.c[0] - sc.c[0], bc.c[1] - sc.c[1]); if (d < bd) { bd = d; best = bc; } });
    best.mp = best.mp.concat(sc.mp); // disjoint pieces: a plain multipolygon concat is enough
  });
  big.forEach(c => provinces.push({ n: c.n, mp: c.mp }));
});

// ---------- 3. adjacency via shared vertices ----------
const key = p => Math.round(p[0] * 1000) + ':' + Math.round(p[1] * 1000);
const owners = new Map();
provinces.forEach((pv, i) => pv.mp.forEach(poly => poly.forEach(r => r.forEach(p => {
  const k = key(p); let s = owners.get(k); if (!s) owners.set(k, s = new Set()); s.add(i);
}))));
const adj = provinces.map(() => new Set());
owners.forEach(s => { if (s.size > 1) s.forEach(a => s.forEach(b => { if (a !== b) adj[a].add(b); })); });

// ---------- 4. output ----------
const px = lon => (lon + 180) / 360 * W, py = lat => (90 - lat) / 180 * H;
const r1 = v => Math.round(v * 10) / 10;
function toPath(mp) {
  return mp.map(poly => poly.map(ring => {
    let out = '', last = '';
    ring.forEach((p, i) => {
      const s = r1(px(p[0])) + ',' + r1(py(p[1]));
      if (s === last) return;
      out += (i === 0 ? 'M' : 'L') + s; last = s;
    });
    return out + 'Z';
  }).join('')).join('');
}
function inside(pt, mp) {
  return mp.some(poly => {
    let c = false;
    poly.forEach(r => { for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      if ((r[i][1] > pt[1]) !== (r[j][1] > pt[1]) && pt[0] < (r[j][0] - r[i][0]) * (pt[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
    } });
    return c;
  });
}

// Project + round every ring, then fix "T-junctions": if a vertex of one province lies on an edge
// of another, insert it there too, so shared borders have identical segments on both sides.
const projRings = provinces.map(pv => pv.mp.map(poly => poly.map(ring => {
  const out = [];
  ring.forEach(p => { const q = [r1(px(p[0])), r1(py(p[1]))]; const l = out[out.length - 1]; if (!l || l[0] !== q[0] || l[1] !== q[1]) out.push(q); });
  if (out.length > 1 && out[0][0] === out[out.length - 1][0] && out[0][1] === out[out.length - 1][1]) out.pop();
  return out;
})));
const HC = 2, hash = new Map();
projRings.forEach(mp => mp.forEach(poly => poly.forEach(r => r.forEach(p => {
  const k = Math.floor(p[0] / HC) + ':' + Math.floor(p[1] / HC);
  let a = hash.get(k); if (!a) hash.set(k, a = []); a.push(p);
}))));
let inserted = 0;
function fixRing(r) {
  const out = [];
  for (let i = 0; i < r.length; i++) {
    const a = r[i], b = r[(i + 1) % r.length];
    out.push(a);
    const dx = b[0] - a[0], dy = b[1] - a[1], len2 = dx * dx + dy * dy;
    if (len2 < 1e-9) continue;
    const found = new Map();
    for (let gx = Math.floor(Math.min(a[0], b[0]) / HC); gx <= Math.floor(Math.max(a[0], b[0]) / HC); gx++)
      for (let gy = Math.floor(Math.min(a[1], b[1]) / HC); gy <= Math.floor(Math.max(a[1], b[1]) / HC); gy++)
        (hash.get(gx + ':' + gy) || []).forEach(p => {
          const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
          if (t <= 1e-6 || t >= 1 - 1e-6) return;
          const ex = a[0] + t * dx - p[0], ey = a[1] + t * dy - p[1];
          if (ex * ex + ey * ey < 0.0144) found.set(p[0] + ',' + p[1], { p, t });
        });
    [...found.values()].sort((u, v) => u.t - v.t).forEach(f => { out.push(f.p); inserted++; });
  }
  return out;
}
const ringsToPath = mp => mp.map(poly => poly.map(r => 'M' + fixRing(r).map(p => p[0] + ',' + p[1]).join('L') + 'Z').join('')).join('');

const out = { w: W, h: H, unclaimed: toPath(unclaimed), labels: {}, labelProv: {}, provinces: [] };
provinces.forEach((pv, i) => {
  const c = centroid(pv.mp);
  // Weight ~ real land area (degrees shrink towards the poles).
  const weight = area(pv.mp) * Math.cos(c[1] * Math.PI / 180);
  out.provinces.push({ n: pv.n, d: ringsToPath(projRings[i]), c: [r1(px(c[0])), r1(py(c[1]))], w: Math.round(weight * 10) / 10, a: [...adj[i]] });
});
console.log('T-junction vertices inserted:', inserted);
for (const id in LABELS) {
  out.labels[id] = [r1(px(LABELS[id][0])), r1(py(LABELS[id][1]))];
  let idx = provinces.findIndex(pv => pv.n === id && inside(LABELS[id], pv.mp));
  if (idx < 0) { // label over water: nearest province of that nation
    let bd = 1e9;
    out.provinces.forEach((pv, i) => { if (pv.n !== id) return; const d = Math.hypot(pv.c[0] - out.labels[id][0], pv.c[1] - out.labels[id][1]); if (d < bd) { bd = d; idx = i; } });
  }
  out.labelProv[id] = idx;
}

const file = path.join(__dirname, '..', 'js', 'mapdata.js');
fs.writeFileSync(file, '// Generated by tools/build-map.js from Natural Earth (world-atlas). Do not edit by hand.\n' +
  'var G = window.G || (window.G = {});\nG.mapdata = ' + JSON.stringify(out) + ';\n');
const per = {};
out.provinces.forEach(p => { per[p.n] = (per[p.n] || 0) + 1; });
const lonely = out.provinces.filter(p => !p.a.length).length;
console.log('wrote', file, (fs.statSync(file).size / 1024).toFixed(0) + ' KB,', out.provinces.length, 'provinces,', lonely, 'without neighbours');
console.log(JSON.stringify(per), 'labelProv', JSON.stringify(out.labelProv));
