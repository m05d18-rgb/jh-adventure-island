// 翻牌：一次一張，點擊翻面；「記得」移出、「不記得」排到最後。
(function () {
  'use strict';
  window.APP_ACTIVITIES = window.APP_ACTIVITIES || {};

  window.APP_ACTIVITIES.flashcard = function mount(container, data, opts) {
    var h = window.APP_UI.h;
    var queue = window.APP_QUIZ.shuffle(data.cards);
    var total = data.cards.length;
    var flipped = false;
    var done = false;

    var card = h('div', { class: 'flashcard', role: 'button', tabindex: '0', 'aria-live': 'polite' });
    var meta = h('div', { class: 'flashcard-meta' });
    var feedback = h('div', { class: 'feedback', 'aria-live': 'polite' });
    var btnKnow = h('button', { class: 'btn primary', type: 'button', onClick: function () { answer(true); } }, '記得 ✓');
    var btnNot = h('button', { class: 'btn', type: 'button', onClick: function () { answer(false); } }, '不記得，再來一次');

    function render() {
      if (!queue.length) {
        done = true;
        card.className = 'flashcard back';
        card.textContent = '全部記住了，完成！';
        meta.textContent = '';
        btnKnow.disabled = true; btnNot.disabled = true;
        feedback.className = 'feedback ok';
        feedback.textContent = '完成！';
        if (opts && opts.onComplete) opts.onComplete();
        return;
      }
      var c = queue[0];
      card.className = 'flashcard' + (flipped ? ' back' : '');
      card.textContent = flipped ? c.back : c.front;
      meta.innerHTML = '';
      meta.appendChild(h('span', null, '還剩 ' + queue.length + ' / ' + total + ' 張'));
      meta.appendChild(h('span', null, flipped ? '這是答案' : '點卡片看答案'));
    }

    function flip() {
      if (done) return;
      flipped = !flipped;
      render();
    }

    function answer(known) {
      if (done) return;
      var c = queue.shift();
      if (!known) queue.push(c);
      flipped = false;
      feedback.className = 'feedback';
      feedback.textContent = known ? '' : '沒關係，這張會再出現。';
      render();
    }

    card.addEventListener('click', flip);
    card.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });

    container.appendChild(h('div', { class: 'hint' }, '先想想答案，再點卡片翻面核對，然後誠實地選「記得」或「不記得」。'));
    container.appendChild(meta);
    container.appendChild(card);
    container.appendChild(h('div', { class: 'btn-row' }, btnKnow, btnNot));
    container.appendChild(feedback);
    render();

    return { destroy: function () { container.innerHTML = ''; } };
  };
})();
