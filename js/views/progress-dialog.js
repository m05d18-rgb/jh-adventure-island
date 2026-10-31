// 進度對話框：匯出 / 匯入 / 清除。
(function () {
  'use strict';
  window.APP_VIEWS = window.APP_VIEWS || {};

  var dialog = null;

  function download(filename, text) {
    var blob = new Blob([text], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function pickFile(cb) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', function () {
      var f = input.files && input.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () { cb(String(reader.result)); };
      reader.readAsText(f);
    });
    input.click();
  }

  window.APP_VIEWS.progressDialog = function (ctx) {
    var h = ctx.h;
    if (dialog) dialog.remove();

    var close = function () { dialog.close(); };

    dialog = h('dialog', null,
      h('h2', null, '學習進度'),
      h('p', { class: 'muted small' }, '進度存在這個瀏覽器裡。換裝置時可以先匯出，再到另一台匯入。'),
      ctx.store.persistent ? null : h('p', { class: 'note' }, '這個瀏覽器無法儲存進度。'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', onClick: function () {
          download('jh-learn-progress.json', ctx.store.exportJSON());
        } }, '匯出進度檔'),
        h('button', { class: 'btn', type: 'button', onClick: function () {
          pickFile(function (text) {
            var r = ctx.store.importJSON(text);
            if (!r.ok) { alert('匯入失敗：' + r.reason); return; }
            close();
            ctx.rerender();
          });
        } }, '匯入進度檔'),
        h('button', { class: 'btn danger', type: 'button', onClick: function () {
          if (!confirm('確定清除全部進度？這個動作無法復原。')) return;
          ctx.store.clear();
          close();
          ctx.rerender();
        } }, '清除全部進度'),
        h('button', { class: 'btn', type: 'button', onClick: close }, '關閉')
      )
    );
    dialog.addEventListener('click', function (e) { if (e.target === dialog) close(); });
    document.body.appendChild(dialog);
    dialog.showModal();
  };
})();
