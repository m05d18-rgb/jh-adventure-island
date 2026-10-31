// 排序：卡片放在一排格子裡，把卡片拖到另一格會交換位置；按「檢查」比對。
(function () {
  'use strict';
  window.APP_ACTIVITIES = window.APP_ACTIVITIES || {};

  function shuffledNotSolved(items) {
    var s = window.APP_QUIZ.shuffle(items);
    var same = s.every(function (x, i) { return x === items[i]; });
    if (same && items.length > 1) s.push(s.shift());
    return s;
  }

  window.APP_ACTIVITIES.sequence = function mount(container, data, opts) {
    var h = window.APP_UI.h;
    var dnd = window.APP_DND.scope(container);
    var feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });
    var done = false;

    var order = shuffledNotSolved(data.items);
    var slots = order.map(function (text, idx) {
      var item = dnd.makeDraggable(h('div', null, text), { text: text });
      var slot = h('div', { role: 'button', 'aria-label': '第 ' + (idx + 1) + ' 格' }, item);
      dnd.makeDropZone(slot, function (payload, slotEl, itemEl) {
        if (done) return;
        var current = slotEl.querySelector('.drag-item');
        if (current === itemEl) return;
        var from = itemEl.parentNode;
        from.appendChild(current);
        slotEl.appendChild(itemEl);
        clearMarks();
      });
      return slot;
    });

    function clearMarks() {
      slots.forEach(function (s) {
        var it = s.querySelector('.drag-item');
        it.classList.remove('misplaced', 'correct');
      });
      feedback.textContent = '';
    }

    function check() {
      var wrongCount = 0;
      slots.forEach(function (s, i) {
        var it = s.querySelector('.drag-item');
        var ok = it._dndPayload.text === data.items[i];
        it.classList.toggle('correct', ok);
        it.classList.toggle('misplaced', !ok);
        if (!ok) wrongCount += 1;
      });
      if (wrongCount === 0) {
        done = true;
        slots.forEach(function (s) { s.querySelector('.drag-item').classList.add('locked'); s.classList.add('correct'); });
        checkBtn.disabled = true;
        feedback.className = 'feedback ok';
        feedback.textContent = '順序全對，完成！';
        if (opts && opts.onComplete) opts.onComplete();
      } else {
        feedback.className = 'feedback bad';
        feedback.textContent = '有 ' + wrongCount + ' 張卡片位置不對（紅框），再調整看看。';
      }
    }

    var checkBtn = h('button', { class: 'btn primary', type: 'button', onClick: check }, '檢查順序');

    container.appendChild(h('div', { class: 'hint' }, data.prompt + '。' + window.APP_DND.hintText.replace('正確位置', '另一格可以交換')));
    container.appendChild(h('div', { class: 'seq-list' }, slots));
    container.appendChild(h('div', { class: 'btn-row' }, checkBtn));
    container.appendChild(feedback);

    return { destroy: function () { dnd.destroy(); container.innerHTML = ''; } };
  };
})();
