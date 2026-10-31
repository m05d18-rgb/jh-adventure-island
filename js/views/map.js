// 首頁：3D 冒險島地圖 + HUD + 島嶼清單；無 WebGL 時退回清單。
(function () {
  'use strict';
  window.APP_VIEWS = window.APP_VIEWS || {};

  var GAME = window.APP_GAME;
  var LAYOUT = window.APP_LAYOUT;
  var MAP = window.APP_MAP;
  var M = window.APP_MASCOT;

  var current = null; // { scene, labels, bubble, root }

  function isMobile() {
    return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || window.innerWidth < 768;
  }

  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  function unitNumber(unit) {
    var m = /(\d+)/.exec(unit.title || '');
    return m ? m[1] : String(unit.order);
  }

  function stateOf(ctx, unit) {
    return GAME.computeStars(ctx.store.get(unit.id), unit);
  }

  // ---- 島嶼清單（也是無 WebGL 的退路） ----
  window.APP_VIEWS.islandList = function (root, ctx, opts) {
    var h = ctx.h;
    var wrap = h('div', { class: 'island-list' });
    Object.keys(ctx.subjects).forEach(function (key) {
      var s = ctx.subjects[key];
      var tracks = s.tracks ? Object.keys(s.tracks) : [null];
      tracks.forEach(function (t) {
        var units = ctx.content.list(key, t);
        if (!units.length) return;
        var starSum = units.reduce(function (n, u) { return n + stateOf(ctx, u).count; }, 0);
        wrap.appendChild(h('h2', { class: s.cls }, s.name + (t ? '・' + s.tracks[t] : ''),
          h('span', { class: 'muted small' }, '★ ' + starSum + ' / ' + units.length * 3)));
        units.forEach(function (u) {
          var st = stateOf(ctx, u);
          wrap.appendChild(h('a', { class: 'unit-row ' + s.cls, href: ctx.hashOf({ view: 'unit', unitId: u.id }) },
            h('span', { class: 'num' }, unitNumber(u)),
            h('span', { class: 'title' }, u.title.replace(/^第\d+[章課]\s*/, '')),
            M.starsEl(st, { small: true })));
        });
      });
    });
    if (!wrap.children.length) wrap.appendChild(h('div', { class: 'empty' }, '尚無單元'));
    root.appendChild(wrap);
    return wrap;
  };

  // ---- HUD ----
  function buildHud(ctx) {
    var h = ctx.h;
    var player = ctx.store.getPlayer();
    var units = ctx.content.all();
    var states = ctx.store.allUnits();
    var xp = GAME.totalXp(states);
    var lv = GAME.levelFor(xp);
    var stars = 0, flags = 0;
    units.forEach(function (u) { var s = GAME.computeStars(states[u.id] || ctx.store.get(u.id), u); stars += s.count; if (s.flag) flags += 1; });
    var pct = Math.round(((xp - lv.levelStart) / (lv.nextAt - lv.levelStart)) * 100);
    var streak = player.streak ? player.streak.count : 0;
    return h('div', { class: 'hud' },
      h('div', null, h('span', { class: 'name' }, player.name || '冒險者'), h('span', { class: 'lv' }, 'Lv.' + lv.level)),
      h('div', { class: 'xp-bar', title: xp + ' / ' + lv.nextAt + ' XP' }, h('span', { style: { width: pct + '%' } })),
      h('div', { class: 'row small' },
        h('span', null, '★ ', h('b', null, stars), ' / ' + units.length * 3),
        h('span', null, '🚩 ', h('b', null, flags), ' / ' + units.length),
        h('span', null, '🔥 ', h('b', null, streak), ' 天'))
    );
  }

  // ---- 主畫面 ----
  window.APP_VIEWS.map = function (root, ctx) {
    var h = ctx.h;
    var player = ctx.store.getPlayer();
    if (!player.name) {
      window.APP_VIEWS.welcome(ctx, function () { ctx.rerender(); });
      return;
    }

    document.body.classList.add('map-mode');
    var units = ctx.content.all();
    var states = ctx.store.allUnits();
    var mapRoot = h('div', { class: 'map-root' });
    root.appendChild(mapRoot);

    // 退路
    if (!hasWebGL() || !window.THREE) {
      return fallback(root, mapRoot, ctx, '這個瀏覽器無法顯示 3D 地圖，改用清單。');
    }

    var S;
    try {
      S = MAP.createScene(mapRoot, { isMobile: isMobile() });
    } catch (e) {
      return fallback(root, mapRoot, ctx, '3D 地圖載入失敗，改用清單。');
    }

    var lay = LAYOUT.layoutIslands(units);
    var labels = MAP.createLabels(mapRoot);
    var groups = {}, hitTargets = [];

    lay.islands.forEach(function (isl, i) {
      var st = GAME.computeStars(states[isl.id] || ctx.store.get(isl.id), isl.unit);
      var state = st.flag ? 'flag' : (st.count > 0 ? 'progress' : 'new');
      var g = MAP.buildIsland({ id: isl.id, x: isl.x, z: isl.z, seed: i + 1, state: state });
      S.add(g);
      groups[isl.id] = g;
      hitTargets.push(g.userData.body, g.userData.top);
      var s = ctx.subjects[isl.unit.subject];
      var el = h('div', { class: s.cls + (st.flag ? ' flagged' : ''), dataset: { id: isl.id } },
        h('span', { class: 'num' }, unitNumber(isl.unit)),
        h('span', { class: 'title' }, isl.unit.title.replace(/^第\d+[章課]\s*/, '')),
        M.starsEl(st, { small: true }));
      el.addEventListener('click', function () { goTo(isl); });
      labels.add(isl.id, el, new window.THREE.Vector3(isl.x, 2.8, isl.z));
      labels.setImportant(isl.id, st.flag);
    });
    lay.bridges.forEach(function (b) {
      var a = lay.islands.find(function (x) { return x.id === b.from; });
      var c = lay.islands.find(function (x) { return x.id === b.to; });
      var m = MAP.buildBridge(a, c);
      if (m) S.add(m);
    });
    // 裝飾小島
    for (var k = 0; k < 10; k++) {
      var dx = lay.bounds.minX - 25 + k * 11 + (k % 2) * 6, dz = lay.bounds.maxZ + 18 + (k % 3) * 9;
      S.add(MAP.buildDecor(k + 1, dx, dz));
      S.add(MAP.buildDecor(k + 20, dx + 7, lay.bounds.minZ - 16 - (k % 2) * 8));
    }

    // 咕博士站在該去的島
    var target = LAYOUT.nearestIslandForPlayer(lay.islands, states, player.lastUnit);
    var owl = MAP.buildOwl();
    if (target) {
      owl.position.set(target.x + 1.3, 1.1, target.z + 1.5);
      owl.userData.baseY = 1.1;
      labels.setImportant(target.id, true);
      var tEl = mapRoot.querySelector('.island-label[data-id="' + target.id + '"]');
      if (tEl) tEl.classList.add('current');
    }
    S.add(owl);

    // 鏡頭：島少時拉遠看全圖；島多時對準目前的島。桌面右側有清單面板，把焦點往右移一點讓內容落在左半。
    var b = lay.bounds;
    var aspect = Math.max(0.3, (mapRoot.clientWidth || 1) / (mapRoot.clientHeight || 1));
    var portrait = aspect < 0.9;
    // 直向螢幕：鏡頭轉 90 度，讓沿 x 軸排的島鏈落在螢幕的長邊
    if (portrait) S.orbit.angle = Math.PI / 2;
    var spanX = b.maxX - b.minX + 8, spanZ = b.maxZ - b.minZ + 14;
    var screenX = portrait ? spanZ : spanX, screenY = portrait ? spanX : spanZ;
    var tanHalf = Math.tan(22.5 * Math.PI / 180);
    var few = lay.islands.length <= 10;
    var cx = few ? (b.minX + b.maxX) / 2 : (target ? target.x : (b.minX + b.maxX) / 2);
    var cz = few ? (b.minZ + b.maxZ) / 2 : (target ? target.z : (b.minZ + b.maxZ) / 2);
    var dist = few
      ? Math.min(125, Math.max(45, (screenX / 2) / (tanHalf * aspect) + 20, (screenY / 2) / tanHalf * 1.3 + 20))
      : (isMobile() ? 52 : 62);
    var sideW = window.innerWidth >= 900 ? 340 : 0;
    var shiftX = sideW ? (sideW / 2 / mapRoot.clientWidth) * dist * 1.2 : 0;
    S.orbit.distance = dist;
    S.setTarget(cx + shiftX, cz + (portrait ? 0 : 3));

    S.onFrame(function (t) {
      owl.userData.bob(t);
      Object.keys(groups).forEach(function (id) { MAP.animateIsland(groups[id], t); });
      labels.update(S.project, S.orbit.distance);
    });

    var flying = false;
    function goTo(isl) {
      if (flying) return;
      flying = true;
      S.flyTo(isl.x, isl.z, 28, 600).then(function () {
        ctx.navigate({ view: 'unit', unitId: isl.id });
      });
    }
    S.onClick(function (x, y) {
      var hit = S.raycast(x, y, hitTargets);
      if (!hit) return;
      var isl = lay.islands.find(function (i) { return i.id === hit.userData.islandId; });
      if (isl) goTo(isl);
    });

    // HUD、提示、清單面板
    mapRoot.appendChild(buildHud(ctx));
    var hint = h('div', { class: 'map-hint' },
      h('div', { class: 'bubble-inline' },
        h('span', { html: M.svg('happy') }),
        h('span', null, target ? M.pick('mapHint', { name: player.name, unit: target.unit.title }) : '所有島都升旗了，太厲害！'),
        target ? h('button', { class: 'btn primary', type: 'button', onClick: function () { goTo(target); } }, '出發 →') : null));
    mapRoot.appendChild(hint);

    var side = h('aside', { class: 'map-side' },
      h('h2', { style: { marginTop: 0 } }, '島嶼清單'),
      h('p', { class: 'muted small' }, '點一座島開始；三顆星集滿會升金旗。'));
    window.APP_VIEWS.islandList(side, ctx);
    mapRoot.appendChild(side);
    var toggle = h('button', { class: 'btn map-side-toggle', type: 'button', 'aria-expanded': 'false', onClick: function () {
      var open = side.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.textContent = open ? '關閉清單' : '島嶼清單';
    } }, '島嶼清單');
    mapRoot.appendChild(toggle);

    S.start();
    current = { scene: S, labels: labels, root: mapRoot };
  };

  function fallback(root, mapRoot, ctx, reason) {
    var h = ctx.h;
    document.body.classList.remove('map-mode');
    mapRoot.remove();
    var wrap = h('div', { class: 'map-fallback' });
    wrap.appendChild(buildHud(ctx));
    wrap.querySelector('.hud').style.position = 'static';
    wrap.appendChild(h('p', { class: 'fallback-note muted small', style: { marginTop: '12px' } }, reason));
    window.APP_VIEWS.islandList(wrap, ctx);
    root.appendChild(wrap);
    current = { scene: null, labels: null, root: wrap };
  }

  window.APP_VIEWS.teardownMap = function () {
    document.body.classList.remove('map-mode');
    if (!current) return;
    if (current.scene) current.scene.dispose();
    if (current.labels) current.labels.destroy();
    current = null;
  };
})();
