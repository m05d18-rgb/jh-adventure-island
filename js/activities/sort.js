// 分類：把項目拖進正確的籃子。
(function () {
  'use strict';
  window.APP_ACTIVITIES = window.APP_ACTIVITIES || {};

  window.APP_ACTIVITIES.sort = function mount(container, data, opts) {
    var h = window.APP_UI.h;
    var dnd = window.APP_DND.scope(container);
    var remaining = data.items.length;
    var feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });

    var buckets = data.buckets.map(function (name, idx) {
      var zone = h('div', { dataset: { bucket: String(idx) }, role: 'button', 'aria-label': '放到「' + name + '」' });
      dnd.makeDropZone(zone, function (payload, zoneEl, itemEl) {
        if (payload.bucket === Number(zoneEl.dataset.bucket)) {
          zoneEl.appendChild(itemEl);
          itemEl.classList.add('locked');
          zoneEl.classList.add('filled');
          remaining -= 1;
          feedback.className = 'feedback ok';
          if (remaining === 0) {
            feedback.textContent = '全部分類正確，完成！';
            data.buckets.forEach(function (_, i) { zones[i].classList.add('correct'); });
            if (opts && opts.onComplete) opts.onComplete();
          } else {
            feedback.textContent = '對了！還剩 ' + remaining + ' 個。';
          }
        } else {
          window.APP_DND.flashWrong(itemEl);
          feedback.className = 'feedback bad';
          feedback.textContent = '再想想，「' + payload.text + '」不屬於「' + name + '」。';
        }
      });
      return { el: h('div', { class: 'bucket' }, h('h4', null, name), zone), zone: zone };
    });
    var zones = buckets.map(function (b) { return b.zone; });

    var pool = h('div', { class: 'pool' },
      window.APP_QUIZ.shuffle(data.items).map(function (it) {
        return dnd.makeDraggable(h('div', null, it.text), { text: it.text, bucket: it.bucket });
      })
    );

    container.appendChild(h('div', { class: 'hint' }, window.APP_DND.hintText));
    container.appendChild(h('div', { class: 'buckets' }, buckets.map(function (b) { return b.el; })));
    container.appendChild(pool);
    container.appendChild(feedback);

    return { destroy: function () { dnd.destroy(); container.innerHTML = ''; } };
  };
})();
