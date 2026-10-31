// 填空：句子中的 [[答案]] 變成放置區，從選項拖入；全部填滿後自動檢查。
(function () {
  'use strict';
  window.APP_ACTIVITIES = window.APP_ACTIVITIES || {};

  function parse(sentence) {
    var parts = [];
    var re = /\[\[([^\]]+)\]\]/g;
    var last = 0, m;
    while ((m = re.exec(sentence))) {
      if (m.index > last) parts.push({ text: sentence.slice(last, m.index) });
      parts.push({ blank: m[1] });
      last = re.lastIndex;
    }
    if (last < sentence.length) parts.push({ text: sentence.slice(last) });
    return parts;
  }

  window.APP_ACTIVITIES.fill = function mount(container, data, opts) {
    var h = window.APP_UI.h;
    var dnd = window.APP_DND.scope(container);
    var feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });
    var pool = h('div', { class: 'pool' });
    var zones = [];
    var done = false;

    var sentence = h('div', { class: 'fill-sentence' }, parse(data.sentence).map(function (p) {
      if (p.text != null) return document.createTextNode(p.text);
      var zone = h('span', { dataset: { answer: p.blank }, role: 'button', 'aria-label': '空格 ' + (zones.length + 1) });
      dnd.makeDropZone(zone, function (payload, zoneEl, itemEl) {
        if (done) return;
        var existing = zoneEl.querySelector('.drag-item');
        if (existing && existing !== itemEl) pool.appendChild(existing);
        zoneEl.appendChild(itemEl);
        zoneEl.classList.add('filled');
        zones.forEach(function (z) { if (!z.querySelector('.drag-item')) z.classList.remove('filled'); });
        if (zones.every(function (z) { return z.querySelector('.drag-item'); })) check();
      });
      zones.push(zone);
      return zone;
    }));

    function check() {
      var wrong = 0;
      zones.forEach(function (z) {
        var it = z.querySelector('.drag-item');
        if (it._dndPayload.text === z.dataset.answer) {
          z.classList.add('correct');
          it.classList.add('locked');
        } else {
          wrong += 1;
          window.APP_DND.flashWrong(it);
          setTimeout(function () { pool.appendChild(it); z.classList.remove('filled'); }, 350);
        }
      });
      if (wrong === 0) {
        done = true;
        feedback.className = 'feedback ok';
        feedback.textContent = '全部填對，完成！';
        if (opts && opts.onComplete) opts.onComplete();
      } else {
        feedback.className = 'feedback bad';
        feedback.textContent = '有 ' + wrong + ' 格不對，已經放回選項區，再試一次。';
      }
    }

    var answers = zones.map(function (z) { return z.dataset.answer; });
    window.APP_QUIZ.shuffle(answers.concat(data.distractors || [])).forEach(function (text) {
      pool.appendChild(dnd.makeDraggable(h('div', null, text), { text: text }));
    });

    container.appendChild(h('div', { class: 'hint' }, window.APP_DND.hintText));
    container.appendChild(sentence);
    container.appendChild(pool);
    container.appendChild(feedback);

    return { destroy: function () { dnd.destroy(); container.innerHTML = ''; } };
  };
})();
