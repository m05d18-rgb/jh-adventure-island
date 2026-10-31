// 3D → 2D 的 HTML 標籤：每幀依鏡頭投影更新位置。
(function () {
  'use strict';
  window.APP_MAP = window.APP_MAP || {};

  // 縮放距離超過這個值時只顯示重要標籤
  var FAR = 120;

  window.APP_MAP.createLabels = function (container) {
    var layer = document.createElement('div');
    layer.className = 'map-labels';
    container.appendChild(layer);
    var items = {};

    return {
      add: function (id, el, vec3) {
        el.classList.add('island-label');
        layer.appendChild(el);
        items[id] = { el: el, pos: vec3 };
      },
      setImportant: function (id, important) {
        if (items[id]) items[id].el.dataset.important = important ? '1' : '0';
      },
      update: function (project, distance) {
        var far = distance > FAR;
        layer.classList.toggle('mid', distance > 100 && !far); // 中距離只顯示編號與星星
        Object.keys(items).forEach(function (id) {
          var it = items[id];
          var p = project(it.pos);
          var hide = !p.visible || (far && it.el.dataset.important !== '1');
          it.el.classList.toggle('hidden', hide);
          if (!hide) it.el.style.transform = 'translate(' + Math.round(p.x) + 'px,' + Math.round(p.y) + 'px) translate(-50%, -100%)';
        });
      },
      remove: function (id) {
        if (items[id]) { items[id].el.remove(); delete items[id]; }
      },
      destroy: function () { layer.remove(); items = {}; },
    };
  };
})();
