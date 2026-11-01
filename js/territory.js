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

  return { init: init, owned: owned, center: center, cede: cede, annex: annex, restore: restore, landShare: landShare, bordering: bordering, enabled: enabled };
})();
