// 3D 場景：海、天空、燈光、鏡頭、自製拖曳旋轉與縮放、動畫迴圈、投影與射線。
// 需要 window.THREE（js/vendor/three.min.js）。
(function () {
  'use strict';
  window.APP_MAP = window.APP_MAP || {};

  var T = window.THREE;

  function easeInOut(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }

  window.APP_MAP.createScene = function (container, opts) {
    opts = opts || {};
    var isMobile = !!opts.isMobile;
    if (!T) throw new Error('THREE not loaded');

    var renderer = new T.WebGLRenderer({ antialias: !isMobile, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));
    renderer.domElement.className = 'map-canvas';
    container.appendChild(renderer.domElement);

    var scene = new T.Scene();
    scene.fog = new T.Fog(0xcfe9ff, 90, 220);

    var camera = new T.PerspectiveCamera(45, 1, 0.1, 500);

    // 燈光
    scene.add(new T.HemisphereLight(0xffffff, 0x88aacc, 0.9));
    var sun = new T.DirectionalLight(0xffffff, 1.1);
    sun.position.set(40, 80, 30);
    scene.add(sun);

    // 海面：頂點正弦波動
    var seaGeo = new T.PlaneGeometry(420, 420, 70, 70);
    seaGeo.rotateX(-Math.PI / 2);
    var seaBase = seaGeo.attributes.position.array.slice();
    var sea = new T.Mesh(seaGeo, new T.MeshLambertMaterial({ color: 0x3aa0d8, transparent: true, opacity: 0.95 }));
    sea.position.y = -0.6;
    scene.add(sea);

    // 鏡頭繞行參數
    var orbit = { target: new T.Vector3(0, 0, 0), angle: 0.12, distance: 60, pitch: 50 * Math.PI / 180 };
    var limits = { min: 22, max: 130 };

    function applyCamera() {
      var d = orbit.distance;
      var y = Math.sin(orbit.pitch) * d;
      var r = Math.cos(orbit.pitch) * d;
      camera.position.set(orbit.target.x + Math.sin(orbit.angle) * r, y, orbit.target.z + Math.cos(orbit.angle) * r);
      camera.lookAt(orbit.target);
    }

    function resize() {
      var w = container.clientWidth || 1, h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      dirty = true;
    }

    // ---- 互動：拖曳旋轉、滾輪與雙指縮放 ----
    var el = renderer.domElement;
    var pointers = {};
    var dragStart = null, startAngle = 0, pinchStart = 0, pinchDist0 = 0, moved = false;
    var interacting = false;

    function pointerCount() { return Object.keys(pointers).length; }

    function onDown(e) {
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (pointerCount() === 1) {
        dragStart = { x: e.clientX, y: e.clientY };
        startAngle = orbit.angle;
        moved = false;
      } else if (pointerCount() === 2) {
        var ids = Object.keys(pointers);
        var a = pointers[ids[0]], b = pointers[ids[1]];
        pinchDist0 = Math.hypot(a.x - b.x, a.y - b.y);
        pinchStart = orbit.distance;
      }
      interacting = true;
      el.classList.add('dragging');
    }
    function onMove(e) {
      if (!pointers[e.pointerId]) return;
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (pointerCount() === 1 && dragStart) {
        var dx = e.clientX - dragStart.x;
        if (Math.abs(dx) > 4 || Math.abs(e.clientY - dragStart.y) > 4) moved = true;
        orbit.angle = startAngle - dx * 0.006;
        dirty = true;
      } else if (pointerCount() === 2) {
        var ids = Object.keys(pointers);
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist0 > 0) {
          orbit.distance = Math.min(limits.max, Math.max(limits.min, pinchStart * (pinchDist0 / d)));
          dirty = true;
        }
        moved = true;
      }
    }
    function onUp(e) {
      delete pointers[e.pointerId];
      try { el.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      if (pointerCount() === 0) {
        interacting = false;
        el.classList.remove('dragging');
        if (!moved && clickHandler) clickHandler(e.clientX, e.clientY);
        dragStart = null;
      }
    }
    function onWheel(e) {
      e.preventDefault();
      orbit.distance = Math.min(limits.max, Math.max(limits.min, orbit.distance * (e.deltaY > 0 ? 1.1 : 0.9)));
      dirty = true;
    }
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', resize);

    var clickHandler = null;

    // ---- 動畫迴圈 ----
    var running = false, raf = 0, dirty = true, frameFns = [], lastTime = 0, tweens = [];
    var hiddenPause = false;

    function onVis() { hiddenPause = document.hidden; if (!hiddenPause) { dirty = true; loop(performance.now()); } }
    document.addEventListener('visibilitychange', onVis);

    function animateSea(t) {
      var pos = seaGeo.attributes.position;
      var arr = pos.array;
      for (var i = 0; i < arr.length; i += 3) {
        var x = seaBase[i], z = seaBase[i + 2];
        arr[i + 1] = seaBase[i + 1] + Math.sin(x * 0.12 + t * 0.0012) * 0.25 + Math.cos(z * 0.1 + t * 0.0009) * 0.25;
      }
      pos.needsUpdate = true;
    }

    function loop(now) {
      if (!running || hiddenPause) return;
      var busy = interacting || tweens.length > 0;
      var interval = busy ? 0 : 33; // 閒置時約 30fps（海浪與浮動仍要動）
      if (now - lastTime >= interval) {
        lastTime = now;
        // tweens
        tweens = tweens.filter(function (tw) {
          var k = Math.min(1, (now - tw.start) / tw.ms);
          tw.step(easeInOut(k));
          if (k >= 1) { tw.done(); return false; }
          return true;
        });
        animateSea(now);
        applyCamera();
        camera.updateMatrixWorld();
        frameFns.forEach(function (fn) { fn(now); });
        renderer.render(scene, camera);
        dirty = false;
      }
      raf = requestAnimationFrame(loop);
    }

    function flyTo(x, z, distance, ms) {
      return new Promise(function (resolve) {
        var from = { x: orbit.target.x, z: orbit.target.z, d: orbit.distance };
        tweens.push({
          start: performance.now(), ms: ms || 600,
          step: function (k) {
            orbit.target.x = from.x + (x - from.x) * k;
            orbit.target.z = from.z + (z - from.z) * k;
            if (distance) orbit.distance = from.d + (distance - from.d) * k;
            dirty = true;
          },
          done: resolve,
        });
        // 分頁隱藏時 rAF 不跑，保證會完成
        setTimeout(function () { orbit.target.x = x; orbit.target.z = z; if (distance) orbit.distance = distance; resolve(); }, (ms || 600) + 100);
      });
    }

    var raycaster = new T.Raycaster();
    var ndc = new T.Vector2();
    function raycast(clientX, clientY, objects) {
      var rect = el.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      var hits = raycaster.intersectObjects(objects, true);
      return hits.length ? hits[0].object : null;
    }

    var tmp = new T.Vector3();
    function project(vec3) {
      tmp.copy(vec3).project(camera);
      var rect = el.getBoundingClientRect();
      return {
        x: (tmp.x + 1) / 2 * rect.width,
        y: (1 - tmp.y) / 2 * rect.height,
        visible: tmp.z < 1 && tmp.x > -1.2 && tmp.x < 1.2 && tmp.y > -1.2 && tmp.y < 1.2,
      };
    }

    function dispose() {
      running = false;
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
      scene.traverse(function (o) {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.dispose(); });
        }
      });
      renderer.dispose();
      el.remove();
    }

    resize();
    applyCamera();

    return {
      scene: scene, camera: camera, renderer: renderer, orbit: orbit,
      add: function (obj) { scene.add(obj); dirty = true; },
      start: function () { if (running) return; running = true; lastTime = 0; raf = requestAnimationFrame(loop); },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      onFrame: function (fn) { frameFns.push(fn); },
      onClick: function (fn) { clickHandler = fn; },
      setDirty: function () { dirty = true; },
      setTarget: function (x, z) { orbit.target.set(x, 0, z); applyCamera(); dirty = true; },
      flyTo: flyTo,
      project: project,
      raycast: raycast,
      resize: resize,
      dispose: dispose,
      get isRunning() { return running; },
    };
  };
})();
