// 圖片標示：把名稱拖到圖上的正確位置（放置區依 x%、y% 定位）。
(function () {
  'use strict';
  window.APP_ACTIVITIES = window.APP_ACTIVITIES || {};

  window.APP_ACTIVITIES.label = function mount(container, data, opts) {
    var h = window.APP_UI.h;
    var dnd = window.APP_DND.scope(container);
    var remaining = data.labels.length;
    var feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });

    var figure = h('div', { class: 'label-figure' });
    figure.innerHTML = data.svg;

    data.labels.forEach(function (l, i) {
      var zone = h('div', {
        dataset: { text: l.text },
        style: { left: l.x + '%', top: l.y + '%' },
        role: 'button',
        'aria-label': '位置 ' + (i + 1),
      }, h('span', { class: 'muted small' }, String(i + 1)));
      dnd.makeDropZone(zone, function (payload, zoneEl, itemEl) {
        if (payload.text === zoneEl.dataset.text) {
          zoneEl.innerHTML = '';
          zoneEl.appendChild(itemEl);
          itemEl.classList.add('locked');
          zoneEl.classList.add('correct', 'filled');
          remaining -= 1;
          feedback.className = 'feedback ok';
          feedback.textContent = remaining === 0 ? '全部標對，完成！' : '對了！還剩 ' + remaining + ' 個。';
          if (remaining === 0 && opts && opts.onComplete) opts.onComplete();
        } else {
          window.APP_DND.flashWrong(itemEl);
          feedback.className = 'feedback bad';
          feedback.textContent = '「' + payload.text + '」不在這個位置，再想想。';
        }
      });
      figure.appendChild(zone);
    });

    var pool = h('div', { class: 'pool' },
      window.APP_QUIZ.shuffle(data.labels).map(function (l) {
        return dnd.makeDraggable(h('div', null, l.text), { text: l.text });
      })
    );

    container.appendChild(h('div', { class: 'hint' }, window.APP_DND.hintText));
    container.appendChild(figure);
    container.appendChild(pool);
    container.appendChild(feedback);

    return { destroy: function () { dnd.destroy(); container.innerHTML = ''; } };
  };
})();
