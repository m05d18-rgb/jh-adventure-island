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
      reader.onerror = function () { cb(''); };
      reader.readAsText(f);
    });
    input.click();
  }

  window.APP_VIEWS.progressDialog = function (ctx) {
    var h = ctx.h;
    if (dialog) dialog.remove();

    var renamed = false;
    var close = function () {
      dialog.close();
      if (renamed) ctx.rerender(); // 改名後讓 HUD 立刻更新
    };
    var message = h('p', { class: 'note', 'aria-live': 'polite' });
    var confirmRow = h('div', { class: 'btn-row' });
    var armed = false; // 清除需要按兩次

    var clearBtn = h('button', { class: 'btn danger', type: 'button', onClick: function () {
      if (!armed) {
        armed = true;
        clearBtn.textContent = '確定清除？再按一次';
        message.textContent = '這個動作無法復原。';
        return;
      }
      ctx.store.clear();
      close();
      ctx.rerender();
    } }, '清除全部進度');

    var GAME = window.APP_GAME;
    var player = ctx.store.getPlayer();
    var earned = GAME.mergeBadges(GAME.computeBadges(ctx.store.allUnits(), ctx.content.all(), player.streak), player.badgesSeen);
    var streakNow = GAME.currentStreak(player.streak, GAME.todayStr());
    var nameInput = h('input', { type: 'text', maxlength: '12', value: player.name, 'aria-label': '名字', style: { font: 'inherit', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)', color: 'var(--fg)', width: '100%' },
      onChange: function () { ctx.store.setName(nameInput.value); renamed = true; message.textContent = '名字已更新。'; } });
    var shelf = h('div', { class: 'badge-shelf' }, GAME.BADGES.map(function (b) {
      var got = earned.indexOf(b.id) !== -1;
      return h('div', { class: 'badge-item' + (got ? ' earned' : ''), title: b.desc },
        h('span', { class: 'bn' }, (got ? '🏅 ' : '🔒 ') + b.name), h('span', { class: 'muted' }, b.desc));
    }));

    dialog = h('dialog', null,
      h('h2', null, '學習進度'),
      h('label', { class: 'small muted' }, '名字', nameInput),
      h('p', { class: 'small', style: { margin: '10px 0 0' } }, '🔥 連續 ' + streakNow + ' 天　🏅 徽章 ' + earned.length + ' / ' + GAME.BADGES.length),
      shelf,
      h('div', { class: 'toggles' },
        h('label', { class: 'toggle' },
          h('input', { type: 'checkbox', checked: !!player.unlockAll, onChange: function (e) {
            ctx.store.setUnlockAll(e.target.checked);
            renamed = true; // 關閉時重繪地圖
            message.textContent = e.target.checked ? '已解鎖全部關卡（家長模式）。' : '已恢復依序解鎖。';
          } }),
          ' 解鎖全部關卡（家長用：學校進度超前時打開）'),
        h('label', { class: 'toggle' },
          h('input', { type: 'checkbox', checked: window.APP_SOUND.enabled, onChange: function (e) {
            window.APP_SOUND.setEnabled(e.target.checked);
            if (e.target.checked) window.APP_SOUND.play('correct');
          } }),
          ' 音效')),
      h('p', { class: 'muted small', style: { marginTop: '14px' } }, '進度存在這個瀏覽器裡。換裝置時可以先匯出，再到另一台匯入。'),
      ctx.store.persistent ? null : h('p', { class: 'note' }, '這個瀏覽器無法儲存進度。'),
      h('div', { class: 'btn-row' },
        h('button', { class: 'btn', type: 'button', onClick: function () {
          download('jh-learn-progress.json', ctx.store.exportJSON());
          message.textContent = '已下載 jh-learn-progress.json。';
        } }, '匯出進度檔'),
        h('button', { class: 'btn', type: 'button', onClick: function () {
          pickFile(function (text) {
            var r = ctx.store.validateImport(text);
            if (!r.ok) { message.textContent = '匯入失敗：' + r.reason; return; }
            // 匯入會覆蓋目前進度，先確認
            message.textContent = '這份檔案有 ' + r.unitCount + ' 個單元的進度，匯入會覆蓋目前的進度。';
            confirmRow.innerHTML = '';
            confirmRow.appendChild(h('button', { class: 'btn danger', type: 'button', onClick: function () {
              ctx.store.importJSON(text);
              close();
              ctx.rerender();
            } }, '確定覆蓋並匯入'));
            confirmRow.appendChild(h('button', { class: 'btn', type: 'button', onClick: function () {
              confirmRow.innerHTML = '';
              message.textContent = '已取消匯入。';
            } }, '取消'));
          });
        } }, '匯入進度檔'),
        clearBtn,
        h('button', { class: 'btn', type: 'button', onClick: close }, '關閉')
      ),
      message,
      confirmRow
    );
    dialog.addEventListener('click', function (e) { if (e.target === dialog) close(); });
    document.body.appendChild(dialog);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', ''); // 舊瀏覽器沒有 showModal
  };
})();
