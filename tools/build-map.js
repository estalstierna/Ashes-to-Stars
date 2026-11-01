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
  EF: ['Albania', 'Austria', 'Belgium', 'Bosnia and Herz.', 'Bulgaria', 'Croatia', 'Cyprus', 'Czechia', 'Denmark', 'Estonia',
    'Finland', 'France', 'Germany', 'Greece', 'Greenland', 'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kosovo', 'Latvia', 'Lithuania',
    'Luxembourg', 'Macedonia', 'Moldova', 'Montenegro', 'Netherlands', 'Norway', 'Poland', 'Portugal', 'Romania', 'Serbia', 'Slovakia',
    'Slovenia', 'Spain', 'Switzerland', 'Ukraine', 'United Kingdom'],
  SWE: ['Sweden'],
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
  USA: [-99, 40], CAS: [-123, 52], EF: [12, 49], SWE: [16, 63], RUS: [40, 56], SIB: [105, 63], CHN: [104, 33], IND: [79, 22],
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

const used = new Set();
const geom = {};
function add(id, mp) { geom[id] = geom[id] ? pc.union(geom[id], mp) : mp; }
for (const id in ASSIGN) for (const name of ASSIGN[id]) {
  if (!byName[name]) throw new Error('Unknown country ' + name);
  used.add(name);
  add(id, byName[name]);
}
// Russia: west of the Urals stays Russian, the east is the Siberian Free Republic.
used.add('Russia');
const urals = box(0, 30, 60, 85);
add('RUS', pc.intersection(byName.Russia, urals));
add('SIB', pc.difference(byName.Russia, urals));
// Cascadia: the US Pacific Northwest + western Canada. The rest of Canada joined the USA.
used.add('Canada');
const pnw = box(-125.5, 42, -116.5, 49.5), wcan = box(-141, 48, -114, 70);
add('CAS', pc.intersection(geom.USA, pnw));
add('CAS', pc.intersection(byName.Canada, wcan));
geom.USA = pc.difference(geom.USA, pnw);
add('USA', pc.difference(byName.Canada, wcan));

const missing = Object.keys(byName).filter(n => !used.has(n));
if (missing.length) throw new Error('Unassigned: ' + missing.join(', '));

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

const out = { w: W, h: H, regions: {}, unclaimed: toPath(geom._none), labels: {} };
for (const id in geom) if (id !== '_none') out.regions[id] = toPath(geom[id]);
for (const id in LABELS) out.labels[id] = [r1(px(LABELS[id][0])), r1(py(LABELS[id][1]))];

const file = path.join(__dirname, '..', 'js', 'mapdata.js');
fs.writeFileSync(file, '// Generated by tools/build-map.js from Natural Earth (world-atlas). Do not edit by hand.\n' +
  'var G = window.G || (window.G = {});\nG.mapdata = ' + JSON.stringify(out) + ';\n');
console.log('wrote', file, (fs.statSync(file).size / 1024).toFixed(0) + ' KB', Object.keys(out.regions).join(' '));
