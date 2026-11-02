// Territory: who owns each map province. Wars move provinces between nations.
// State lives in G.state.prov (array of nation ids, one per province in G.mapdata.provinces).
var G = window.G || (window.G = {});

G.territory = (function () {
  function P() { return G.mapdata ? G.mapdata.provinces : []; }
  function S() { return G.state; }
  function enabled() { return !!(G.mapdata && G.mapdata.provinces && S() && S().prov); }

  // Set up ownership. ownerOf (optional) maps an original nation id to today's owner (for old saves).
  function init(ownerOf) {
    S().prov = P().map(function (p) { return ownerOf ? ownerOf(p.n) : p.n; });
  }

  function owned(id) {
    var out = [];
    S().prov.forEach(function (o, i) { if (o === id) out.push(i); });
    return out;
  }
  function weightOf(list) { return list.reduce(function (a, i) { return a + P()[i].w; }, 0); }

  // A reference point for a nation: its label if it still owns that province, else its biggest province.
  function center(id) {
    var M = G.mapdata, lp = M.labelProv[id];
    if (lp >= 0 && S().prov[lp] === id) return M.labels[id];
    // Otherwise: the owned province closest to the weighted middle of everything the nation holds.
    var mine = owned(id);
    if (mine.length) {
      var W = 0, X = 0, Y = 0;
      mine.forEach(function (i) { var p = P()[i]; W += p.w; X += p.c[0] * p.w; Y += p.c[1] * p.w; });
      X /= W; Y /= W;
      var best = mine[0], bd = 1e9;
      mine.forEach(function (i) { var c = P()[i].c, d = Math.hypot(c[0] - X, c[1] - Y) / Math.sqrt(P()[i].w + 1); if (d < bd) { bd = d; best = i; } });
      return P()[best].c;
    }
    return id === 'SGP' && M.labels.SGP ? M.labels.SGP : null;
  }

  // Move roughly `frac` of the loser's land to the winner, starting at their shared border.
  // Returns the number of provinces transferred.
  function cede(winnerId, loserId, frac) {
    if (!enabled()) return 0;
    var prov = S().prov, list = P();
    var mine = owned(loserId);
    if (mine.length <= 1) return 0;
    var target = weightOf(mine) * frac, taken = 0, count = 0;
    var ref = center(winnerId) || center(loserId);
    function dist(i) { return ref ? Math.hypot(list[i].c[0] - ref[0], list[i].c[1] - ref[1]) : 0; }
    while (mine.length > 1) {
      // Prefer provinces bordering the winner; otherwise the ones closest to the winner.
      var border = mine.filter(function (i) { return list[i].a.some(function (j) { return prov[j] === winnerId; }); });
      var pool = border.length ? border : mine;
      pool.sort(function (a, b) { return dist(a) - dist(b); });
      var pick = pool[0], w = list[pick].w;
      if (taken > 0 && taken + w > target * 1.25) break;
      if (taken === 0 && w > target * 2.5) break; // the smallest bite is still far too big
      prov[pick] = winnerId;
      taken += w; count++;
      mine = mine.filter(function (i) { return i !== pick; });
      if (taken >= target) break;
    }
    return count;
  }

  function annex(winnerId, loserId) {
    if (!enabled()) return;
    var prov = S().prov;
    for (var i = 0; i < prov.length; i++) if (prov[i] === loserId) prov[i] = winnerId;
  }

  // A reborn nation takes back its original provinces from its former occupier.
  function restore(id, fromId) {
    if (!enabled()) return;
    var prov = S().prov, list = P(), n = 0;
    list.forEach(function (p, i) { if (p.n === id && prov[i] === fromId) { prov[i] = id; n++; } });
    if (!n && G.mapdata.labelProv[id] >= 0) prov[G.mapdata.labelProv[id]] = id;
  }

  // A regional uprising: a connected cluster of the nation's original provinces, still held by
  // the occupier, breaks away. Returns the share of the occupier's land that rebelled (0 = none).
  function uprising(id, fromId, frac) {
    if (!enabled()) return 0;
    var prov = S().prov, list = P();
    var cand = [];
    list.forEach(function (p, i) { if (p.n === id && prov[i] === fromId) cand.push(i); });
    if (!cand.length) return 0;
    var ownerW = weightOf(owned(fromId));
    var target = weightOf(cand) * frac, set = {}, taken = 0;
    var start = cand[Math.floor(G.util.rand() * cand.length)], queue = [start];
    while (queue.length && (taken < target || taken === 0)) {
      var i = queue.shift();
      if (set[i]) continue;
      set[i] = true; taken += list[i].w; prov[i] = id;
      list[i].a.forEach(function (j) { if (!set[j] && list[j].n === id && prov[j] === fromId) queue.push(j); });
    }
    var homeW = weightOf(list.map(function (_, i) { return i; }).filter(function (i) { return list[i].n === id; }));
    // Share of the occupied nation's homeland that rose up (used for population and economy).
    return homeW > 0 ? taken / homeW : 0;
  }
  // Share of a nation's original homeland that it holds right now.
  function homeShare(id) {
    if (!enabled()) return 0;
    var list = P(), prov = S().prov, all = 0, mine = 0;
    list.forEach(function (p, i) { if (p.n === id) { all += p.w; if (prov[i] === id) mine += p.w; } });
    return all > 0 ? mine / all : 0;
  }

  // Share of a nation's current land that a list of provinces represents.
  function shareOf(list, id) {
    if (!enabled()) return 0;
    var mine = weightOf(owned(id)), part = weightOf(list.filter(function (i) { return S().prov[i] === id; }));
    return mine > 0 ? part / mine : 0;
  }
  function transfer(list, toId) {
    if (!enabled()) return;
    list.forEach(function (i) { S().prov[i] = toId; });
  }
  // Next province to occupy on a front: an enemy province bordering land the attacker owns or
  // already occupies. Overseas wars land on the coast closest to the attacker.
  function frontCandidate(attId, defId, occupied) {
    if (!enabled()) return -1;
    var prov = S().prov, list = P(), occ = {};
    occupied.forEach(function (i) { occ[i] = true; });
    var best = -1, bd = 1e9, ref = center(attId) || [500, 250];
    list.forEach(function (p, i) {
      if (prov[i] !== defId || occ[i]) return;
      var touches = p.a.some(function (j) { return prov[j] === attId || occ[j]; });
      var d = Math.hypot(p.c[0] - ref[0], p.c[1] - ref[1]) - (touches ? 10000 : 0);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  // Nations whose provinces touch this nation's provinces on the map.
  function bordering(id) {
    if (!enabled()) return [];
    var prov = S().prov, list = P(), out = {};
    prov.forEach(function (o, i) {
      if (o !== id) return;
      list[i].a.forEach(function (j) { if (prov[j] && prov[j] !== id) out[prov[j]] = true; });
    });
    return Object.keys(out);
  }

  // Share of the world's land a nation holds (0..1).
  function landShare(id) {
    if (!enabled()) return 0;
    var all = weightOf(P().map(function (_, i) { return i; }));
    return weightOf(owned(id)) / all;
  }

  // Land held outside a nation's own homeland, grouped into connected regions per original
  // nation, with a readable name: "West China" for a part, "China" for (almost) all of it.
  var DIRS = ['East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest', 'North', 'Northeast'];
  function heldRegions() {
    if (!enabled()) return [];
    var prov = S().prov, list = P(), home = {}, seen = {}, out = [];
    list.forEach(function (p) {
      var h = home[p.n] = home[p.n] || { w: 0, x: 0, y: 0, minX: 1e9, maxX: -1e9, minY: 1e9, maxY: -1e9 };
      h.w += p.w; h.x += p.c[0] * p.w; h.y += p.c[1] * p.w;
      h.minX = Math.min(h.minX, p.c[0]); h.maxX = Math.max(h.maxX, p.c[0]); h.minY = Math.min(h.minY, p.c[1]); h.maxY = Math.max(h.maxY, p.c[1]);
    });
    prov.forEach(function (owner, i) {
      var orig = list[i].n;
      if (!owner || owner === orig || seen[i]) return;
      // Flood fill over neighbouring provinces with the same owner and the same original nation.
      var stack = [i], cl = [];
      seen[i] = true;
      while (stack.length) {
        var k = stack.pop(); cl.push(k);
        list[k].a.forEach(function (j) { if (!seen[j] && prov[j] === owner && list[j].n === orig) { seen[j] = true; stack.push(j); } });
      }
      var h = home[orig], W = weightOf(cl);
      if (W < 4 && W < h.w * 0.25) return; // too small to name
      var X = 0, Y = 0;
      cl.forEach(function (k) { X += list[k].c[0] * list[k].w; Y += list[k].c[1] * list[k].w; });
      X /= W; Y /= W;
      var best = cl[0], bd = 1e9;
      cl.forEach(function (k) { var c = list[k].c, d = Math.hypot(c[0] - X, c[1] - Y) / Math.sqrt(list[k].w + 1); if (d < bd) { bd = d; best = k; } });
      var share = W / h.w, dir = '';
      if (share < 0.85) {
        var hx = h.x / h.w, hy = h.y / h.w;
        var dx = (X - hx) / Math.max(20, h.maxX - h.minX), dy = (Y - hy) / Math.max(20, h.maxY - h.minY);
        if (Math.hypot(dx, dy) < 0.12) dir = 'Central';
        else dir = DIRS[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8];
      }
      out.push({ owner: owner, orig: orig, provs: cl, w: W, share: share, dir: dir, at: list[best].c });
    });
    // If an owner holds (almost) all of a nation, name only its biggest piece, after the whole nation.
    var tot = {};
    out.forEach(function (r) { var k = r.owner + '|' + r.orig; tot[k] = (tot[k] || 0) + r.share; });
    out.sort(function (a, b) { return b.w - a.w; });
    var named = {};
    return out.filter(function (r) {
      var k = r.owner + '|' + r.orig;
      if (tot[k] < 0.85) return true;
      if (named[k]) return false;
      named[k] = true; r.dir = '';
      return true;
    });
  }

  return { heldRegions: heldRegions, init: init, owned: owned, center: center, cede: cede, annex: annex, restore: restore, uprising: uprising, homeShare: homeShare, landShare: landShare, bordering: bordering, shareOf: shareOf, transfer: transfer, frontCandidate: frontCandidate, enabled: enabled };
})();
