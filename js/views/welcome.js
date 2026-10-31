// 歡迎畫面：第一次進站輸入名字。
(function () {
  'use strict';
  window.APP_VIEWS = window.APP_VIEWS || {};

  window.APP_VIEWS.welcome = function (ctx, onDone) {
    var h = ctx.h;
    var M = window.APP_MASCOT;
    var input = h('input', { type: 'text', maxlength: '12', placeholder: '輸入你的名字', 'aria-label': '名字', autocomplete: 'off' });
    var err = h('p', { class: 'note', 'aria-live': 'polite' });
    var owl = h('div');
    owl.innerHTML = M.svg('cheer');
    var dialog = h('dialog', { class: 'welcome' },
      owl,
      h('h2', null, '歡迎來到國一冒險島！'),
      h('p', { class: 'muted' }, '我是咕博士。每座島做完三件事：讀重點、做活動、過測驗，就能升起金旗。'),
      h('form', { onSubmit: function (e) {
        e.preventDefault();
        var name = input.value.trim();
        if (!name) { err.textContent = '先告訴我你的名字吧！'; input.focus(); return; }
        ctx.store.setName(name);
        dialog.close();
        dialog.remove();
        onDone(name);
      } },
        input, err,
        h('button', { class: 'btn primary', type: 'submit', style: { width: '100%' } }, '開始冒險')
      )
    );
    // 舊瀏覽器沒有 showModal：直接用預設名字放行，之後可在「進度」改名
    if (typeof dialog.showModal !== 'function') {
      ctx.store.setName('冒險者');
      onDone('冒險者');
      return null;
    }
    // 按 Escape 也用預設名放行，家長先看看網站不必被卡住
    dialog.addEventListener('cancel', function (e) {
      e.preventDefault();
      ctx.store.setName('冒險者');
      dialog.close();
      dialog.remove();
      onDone('冒險者');
    });
    document.body.appendChild(dialog);
    dialog.showModal();
    setTimeout(function () { input.focus(); }, 50);
    return dialog;
  };
})();
