// 建島、橋、裝飾與 3D 咕博士（全部用內建幾何）。
(function () {
  'use strict';
  window.APP_MAP = window.APP_MAP || {};
  var T = window.THREE;

  var COLORS = {
    sandNew: 0xe8d9b0, grassNew: 0xcfd6b8,
    grass: 0x7cc46b, sand: 0xf0dfa8, cliff: 0xb98b5a,
    trunk: 0x8a5a3c, leaf: 0x3f9b57, leaf2: 0x57b06a,
    house: 0xf7f0e6, roof: 0xd9534f, bridge: 0xb07d4b, flag: 0xf2b705, pole: 0x555555,
    owlBody: 0x8a5a3c, owlBelly: 0xf3e3c3, owlBeak: 0xf0a030, owlEye: 0xffffff, owlPupil: 0x2b2b2b,
  };

  function mat(color) { return new T.MeshLambertMaterial({ color: color }); }

  // 簡單的可重現亂數
  function rng(seed) {
    var s = (seed * 9301 + 49297) % 233280;
    return function () { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  }

  function tree(r, scale) {
    var g = new T.Group();
    var trunk = new T.Mesh(new T.CylinderGeometry(0.18, 0.22, 0.8, 6), mat(COLORS.trunk));
    trunk.position.y = 0.4;
    g.add(trunk);
    var leaf = new T.Mesh(new T.ConeGeometry(0.75, 1.6, 7), mat(r() > 0.5 ? COLORS.leaf : COLORS.leaf2));
    leaf.position.y = 1.5;
    g.add(leaf);
    g.scale.setScalar(scale || 1);
    return g;
  }

  function house() {
    var g = new T.Group();
    var base = new T.Mesh(new T.BoxGeometry(1.4, 1.0, 1.2), mat(COLORS.house));
    base.position.y = 0.5;
    g.add(base);
    var roof = new T.Mesh(new T.ConeGeometry(1.15, 0.8, 4), mat(COLORS.roof));
    roof.position.y = 1.4;
    roof.rotation.y = Math.PI / 4;
    g.add(roof);
    return g;
  }

  function flag() {
    var g = new T.Group();
    var pole = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 3.2, 6), mat(COLORS.pole));
    pole.position.y = 1.6;
    g.add(pole);
    var cloth = new T.Mesh(new T.PlaneGeometry(1.4, 0.9, 6, 1), new T.MeshLambertMaterial({ color: COLORS.flag, side: T.DoubleSide }));
    cloth.position.set(0.72, 2.7, 0);
    cloth.userData.base = cloth.geometry.attributes.position.array.slice();
    g.add(cloth);
    g.userData.cloth = cloth;
    g.name = 'flag';
    return g;
  }

  function waveFlag(flagGroup, t) {
    var cloth = flagGroup.userData.cloth;
    var pos = cloth.geometry.attributes.position, base = cloth.userData.base;
    for (var i = 0; i < pos.array.length; i += 3) {
      var x = base[i];
      pos.array[i + 2] = Math.sin(x * 4 + t * 0.006) * 0.12 * (x + 0.7);
    }
    pos.needsUpdate = true;
  }

  // state: 'new' | 'progress' | 'flag'
  window.APP_MAP.buildIsland = function (o) {
    var g = new T.Group();
    g.position.set(o.x, 0, o.z);
    var r = rng((o.seed || 1) * 7 + 3);

    var body = new T.Mesh(new T.CylinderGeometry(3.0, 3.4, 1.4, 6), mat(COLORS.cliff));
    body.position.y = 0.1;
    body.userData.islandId = o.id;
    g.add(body);
    var top = new T.Mesh(new T.CylinderGeometry(3.0, 3.0, 0.3, 6), mat(COLORS.grass));
    top.position.y = 0.95;
    top.userData.islandId = o.id;
    g.add(top);
    var sand = new T.Mesh(new T.CylinderGeometry(3.6, 3.9, 0.3, 6), mat(COLORS.sand));
    sand.position.y = -0.2;
    sand.userData.islandId = o.id;
    g.add(sand);

    var n = 2 + Math.floor(r() * 3);
    for (var i = 0; i < n; i++) {
      var a = r() * Math.PI * 2, d = 1.4 + r() * 1.2;
      var tr = tree(r, 0.7 + r() * 0.5);
      tr.position.set(Math.cos(a) * d, 1.1, Math.sin(a) * d);
      g.add(tr);
    }
    var hs = house();
    hs.position.set(-0.6, 1.1, 0.4);
    hs.rotation.y = r() * Math.PI;
    g.add(hs);

    var fl = flag();
    fl.position.set(1.4, 1.1, -1.2);
    fl.visible = false;
    g.add(fl);

    g.userData = { islandId: o.id, top: top, flag: fl, body: body };
    g.name = 'island:' + o.id;
    window.APP_MAP.setIslandState(g, o.state || 'new');
    return g;
  };

  window.APP_MAP.setIslandState = function (g, state) {
    var top = g.userData.top;
    top.material.color.setHex(state === 'new' ? COLORS.grassNew : COLORS.grass);
    g.userData.flag.visible = state === 'flag';
    g.userData.state = state;
  };

  window.APP_MAP.animateIsland = function (g, t) {
    if (g.userData.flag.visible) waveFlag(g.userData.flag, t);
  };

  window.APP_MAP.buildBridge = function (a, b) {
    var dx = b.x - a.x, dz = b.z - a.z;
    var len = Math.hypot(dx, dz) - 6.2;
    if (len <= 0) return null;
    var m = new T.Mesh(new T.BoxGeometry(len, 0.18, 1.1), mat(COLORS.bridge));
    m.position.set((a.x + b.x) / 2, 0.75, (a.z + b.z) / 2);
    m.rotation.y = -Math.atan2(dz, dx);
    // 欄杆
    var rail = new T.Mesh(new T.BoxGeometry(len, 0.06, 0.06), mat(COLORS.trunk));
    rail.position.set(0, 0.35, 0.5);
    m.add(rail);
    var rail2 = rail.clone();
    rail2.position.z = -0.5;
    m.add(rail2);
    return m;
  };

  window.APP_MAP.buildDecor = function (seed, x, z) {
    var r = rng(seed * 13 + 5);
    var g = new T.Group();
    g.position.set(x, 0, z);
    var s = 0.6 + r() * 0.8;
    var rock = new T.Mesh(new T.CylinderGeometry(1.2 * s, 1.6 * s, 0.8, 5), mat(COLORS.sand));
    rock.position.y = -0.1;
    g.add(rock);
    if (r() > 0.4) {
      var tr = tree(r, 0.6);
      tr.position.y = 0.3;
      g.add(tr);
    }
    return g;
  };

  // 3D 咕博士：圓身、肚子、眼睛、嘴、耳羽
  window.APP_MAP.buildOwl = function () {
    var g = new T.Group();
    var body = new T.Mesh(new T.SphereGeometry(0.9, 14, 12), mat(COLORS.owlBody));
    body.scale.set(1, 1.1, 0.95);
    body.position.y = 0.9;
    g.add(body);
    var belly = new T.Mesh(new T.SphereGeometry(0.6, 12, 10), mat(COLORS.owlBelly));
    belly.scale.set(1, 1.05, 0.6);
    belly.position.set(0, 0.75, 0.55);
    g.add(belly);
    [-0.33, 0.33].forEach(function (ex) {
      var eye = new T.Mesh(new T.SphereGeometry(0.26, 10, 8), mat(COLORS.owlEye));
      eye.position.set(ex, 1.15, 0.72);
      g.add(eye);
      var pupil = new T.Mesh(new T.SphereGeometry(0.13, 8, 8), mat(COLORS.owlPupil));
      pupil.position.set(ex, 1.15, 0.95);
      g.add(pupil);
      var tuft = new T.Mesh(new T.ConeGeometry(0.18, 0.5, 5), mat(COLORS.owlBody));
      tuft.position.set(ex * 1.6, 1.95, 0);
      tuft.rotation.z = -ex * 0.6;
      g.add(tuft);
    });
    var beak = new T.Mesh(new T.ConeGeometry(0.14, 0.32, 4), mat(COLORS.owlBeak));
    beak.position.set(0, 0.95, 0.95);
    beak.rotation.x = Math.PI / 2;
    g.add(beak);
    g.name = 'owl';
    g.userData.bob = function (t) { g.position.y = g.userData.baseY + Math.sin(t * 0.003) * 0.15; };
    g.userData.baseY = 0;
    return g;
  };

  window.APP_MAP.COLORS = COLORS;
})();
