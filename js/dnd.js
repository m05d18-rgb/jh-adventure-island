// 拖曳與點選輔助：同一個項目既能用 Pointer 拖到放置區，也能「先點項目、再點放置區」。
// 用法：
//   var dnd = APP_DND.scope(containerEl);
//   dnd.makeDraggable(el, payload);
//   dnd.makeDropZone(zoneEl, function (payload, zoneEl, itemEl) { ... });
//   dnd.destroy();
(function () {
  'use strict';

  var TAP_THRESHOLD = 8; // 移動小於 8px 視為點選

  function scope(container) {
    var selected = null;      // 目前點選中的項目
    var zones = [];           // { el, onDrop }
    var cleanups = [];

    function clearSelection() {
      if (selected) selected.classList.remove('selected');
      selected = null;
      zones.forEach(function (z) { z.el.classList.remove('target'); });
    }

    function zoneContaining(el) {
      return zones.find(function (z) { return z.el.contains(el); }) || null;
    }

    function select(el) {
      if (selected === el) return clearSelection();
      // 已有選取項目時，點到「放在某個放置區裡的另一個項目」視為放到那一區（排序、填空的交換）
      if (selected) {
        var z = zoneContaining(el);
        if (z && !z.el.classList.contains('correct') && !z.el.contains(selected)) {
          var item = selected;
          clearSelection();
          z.onDrop(item._dndPayload, z.el, item);
          return;
        }
      }
      clearSelection();
      selected = el;
      el.classList.add('selected');
      zones.forEach(function (z) { if (!z.el.classList.contains('correct')) z.el.classList.add('target'); });
    }

    function zoneAt(x, y, exclude) {
      var prev = exclude ? exclude.style.pointerEvents : null;
      if (exclude) exclude.style.pointerEvents = 'none';
      var hit = document.elementFromPoint(x, y);
      if (exclude) exclude.style.pointerEvents = prev;
      while (hit && hit !== container) {
        if (hit.classList && hit.classList.contains('drop-zone')) {
          var z = zones.find(function (zz) { return zz.el === hit; });
          if (z) return z;
        }
        hit = hit.parentNode;
      }
      return null;
    }

    function makeDraggable(el, payload) {
      el.classList.add('drag-item');
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el._dndPayload = payload;

      var startX = 0, startY = 0, dragging = false, moved = false, lastZone = null;

      function onDown(e) {
        if (el.classList.contains('locked')) return;
        if (e.button != null && e.button !== 0) return;
        dragging = true; moved = false;
        startX = e.clientX; startY = e.clientY;
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }

      function onMove(e) {
        if (!dragging) return;
        var dx = e.clientX - startX, dy = e.clientY - startY;
        if (!moved && Math.abs(dx) < TAP_THRESHOLD && Math.abs(dy) < TAP_THRESHOLD) return;
        if (!moved) { moved = true; el.classList.add('dragging'); clearSelection(); }
        el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
        var z = zoneAt(e.clientX, e.clientY, el);
        if (lastZone && lastZone !== z) lastZone.el.classList.remove('over');
        if (z) z.el.classList.add('over');
        lastZone = z;
        e.preventDefault();
      }

      function onUp(e) {
        if (!dragging) return;
        dragging = false;
        try { el.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        if (lastZone) lastZone.el.classList.remove('over');
        if (moved) {
          el.classList.remove('dragging');
          el.style.transform = '';
          var z = zoneAt(e.clientX, e.clientY, el);
          if (z && !z.el.classList.contains('correct')) z.onDrop(payload, z.el, el);
        } else {
          select(el);
        }
        lastZone = null;
      }

      function onKey(e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(el); }
      }

      el.addEventListener('pointerdown', onDown);
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
      el.addEventListener('keydown', onKey);
      cleanups.push(function () {
        el.removeEventListener('pointerdown', onDown);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
        el.removeEventListener('keydown', onKey);
      });
      return el;
    }

    function makeDropZone(el, onDrop) {
      el.classList.add('drop-zone');
      var z = { el: el, onDrop: onDrop };
      zones.push(z);
      function onClick(e) {
        if (!selected) return;
        if (el.classList.contains('correct')) return;
        var item = selected;
        if (item === e.target || item.contains(e.target)) return; // 這是選取項目本身的點擊
        if (el.contains(item)) return; // 已在這個放置區裡
        clearSelection();
        onDrop(item._dndPayload, el, item);
      }
      el.addEventListener('click', onClick);
      cleanups.push(function () { el.removeEventListener('click', onClick); });
      return el;
    }

    function destroy() {
      cleanups.forEach(function (fn) { fn(); });
      cleanups = []; zones = []; selected = null;
    }

    return { makeDraggable: makeDraggable, makeDropZone: makeDropZone, clearSelection: clearSelection, destroy: destroy };
  }

  // 顯示在拖曳中的項目動畫（放錯時）
  function flashWrong(el) {
    el.classList.remove('wrong');
    void el.offsetWidth; // 重新觸發動畫
    el.classList.add('wrong');
    setTimeout(function () { el.classList.remove('wrong'); }, 400);
  }

  window.APP_DND = {
    scope: scope,
    flashWrong: flashWrong,
    hintText: '把項目拖到正確位置；手機上也可以先點項目、再點目標。',
  };
})();
