// 地圖版面：依內容單元算出每座島的位置與橋（純函式）。
// 瀏覽器端：window.APP_LAYOUT；Node 端：require 回傳同物件。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../game-logic.js'));
  } else {
    root.APP_LAYOUT = factory(root.APP_GAME);
  }
})(typeof self !== 'undefined' ? self : this, function (GAME) {
  var DEFAULTS = { perRow: 6, gap: 8, rowGap: 9, chainGap: 14, bioX: -40, socX: 16, bioZ: -7, socZ: -14 };
  var CHAIN_ORDER = ['bio', 'geo', 'hist', 'civ'];

  function chainOf(u) {
    return u.subject === 'bio' ? 'bio' : u.track;
  }

  // 蛇形：每排 perRow 座，偶數排 x 遞增、奇數排 x 遞減
  function placeChain(list, baseX, baseZ, o) {
    return list.map(function (u, i) {
      var row = Math.floor(i / o.perRow);
      var col = i % o.perRow;
      var x = row % 2 === 0 ? baseX + col * o.gap : baseX + (o.perRow - 1 - col) * o.gap;
      var z = baseZ + row * o.rowGap;
      return { id: u.id, x: x, z: z, chain: chainOf(u), index: i, unit: u };
    });
  }

  function layoutIslands(units, opts) {
    var o = Object.assign({}, DEFAULTS, opts || {});
    var chains = { bio: [], geo: [], hist: [], civ: [] };
    (units || []).forEach(function (u) {
      var c = chainOf(u);
      if (chains[c]) chains[c].push(u);
    });
    Object.keys(chains).forEach(function (c) {
      chains[c].sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    });

    var islands = [];
    var bridges = [];
    CHAIN_ORDER.forEach(function (c, ci) {
      var baseX = c === 'bio' ? o.bioX : o.socX;
      var baseZ = c === 'bio' ? o.bioZ : o.socZ + (ci - 1) * o.chainGap;
      var placed = placeChain(chains[c], baseX, baseZ, o);
      for (var i = 1; i < placed.length; i++) {
        bridges.push({ from: placed[i - 1].id, to: placed[i].id });
      }
      islands = islands.concat(placed);
    });

    var bounds = islands.reduce(function (b, i) {
      return { minX: Math.min(b.minX, i.x), maxX: Math.max(b.maxX, i.x), minZ: Math.min(b.minZ, i.z), maxZ: Math.max(b.maxZ, i.z) };
    }, { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity });
    if (!islands.length) bounds = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };

    return { islands: islands, bridges: bridges, bounds: bounds };
  }

  function hasFlag(island, statesById) {
    var s = statesById[island.id];
    if (!s) return false;
    return GAME.computeStars(s, island.unit).flag;
  }

  // 玩家「現在該去」的島：上次進入且未金旗的島；否則第一座未金旗的島；全金旗則最後一座
  function nearestIslandForPlayer(islands, statesById, lastUnit) {
    statesById = statesById || {};
    if (!islands.length) return null;
    if (lastUnit) {
      var last = islands.find(function (i) { return i.id === lastUnit; });
      if (last && !hasFlag(last, statesById)) return last;
    }
    var first = islands.find(function (i) { return !hasFlag(i, statesById); });
    return first || islands[islands.length - 1];
  }

  return { layoutIslands: layoutIslands, nearestIslandForPlayer: nearestIslandForPlayer, DEFAULTS: DEFAULTS };
});
