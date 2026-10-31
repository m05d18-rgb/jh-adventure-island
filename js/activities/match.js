// 配對：左欄固定，右欄打亂；把右項拖到左項旁的放置區。
(function () {
  'use strict';
  window.APP_ACTIVITIES = window.APP_ACTIVITIES || {};

  window.APP_ACTIVITIES.match = function mount(container, data, opts) {
    var h = window.APP_UI.h;
    var dnd = window.APP_DND.scope(container);
    var remaining = data.pairs.length;
    var feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });

    var rows = data.pairs.map(function (p) {
      var zone = h('div', { dataset: { right: p.right }, role: 'button', 'aria-label': '放到「' + p.left + '」' });
      dnd.makeDropZone(zone, function (payload, zoneEl, itemEl) {
        if (payload.right === zoneEl.dataset.right) {
          zoneEl.appendChild(itemEl);
          itemEl.classList.add('locked');
          zoneEl.classList.add('correct', 'filled');
          remaining -= 1;
          feedback.className = 'feedback ok';
          feedback.textContent = remaining === 0 ? '全部配對正確，完成！' : '對了！還剩 ' + remaining + ' 組。';
          if (remaining === 0 && opts && opts.onComplete) opts.onComplete();
        } else {
          window.APP_DND.flashWrong(itemEl);
          feedback.className = 'feedback bad';
          feedback.textContent = '再想想，這個不是「' + zoneEl.parentNode.querySelector('.left').textContent + '」的說明。';
        }
      });
      return h('div', { class: 'match-row' }, h('div', { class: 'left' }, p.left), zone);
    });

    var pool = h('div', { class: 'pool' },
      window.APP_QUIZ.shuffle(data.pairs).map(function (p) {
        return dnd.makeDraggable(h('div', null, p.right), { right: p.right });
      })
    );

    container.appendChild(h('div', { class: 'hint' }, window.APP_DND.hintText));
    container.appendChild(h('div', { class: 'match-rows' }, rows));
    container.appendChild(h('div', { class: 'small muted', style: { margin: '10px 0 4px' } }, '可用的說明：'));
    container.appendChild(pool);
    container.appendChild(feedback);

    return { destroy: function () { dnd.destroy(); container.innerHTML = ''; } };
  };
})();
