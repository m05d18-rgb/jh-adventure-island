// 首頁：兩張科目卡與完成進度。
(function () {
  'use strict';
  window.APP_VIEWS = window.APP_VIEWS || {};

  function unitsOf(ctx, subject) {
    var s = ctx.subjects[subject];
    if (!s.tracks) return ctx.content.list(subject, null);
    return Object.keys(s.tracks).reduce(function (acc, t) {
      return acc.concat(ctx.content.list(subject, t));
    }, []);
  }

  function countDone(ctx, units) {
    return units.filter(function (u) {
      return ctx.store.isUnitDone(u.id, ctx.unitActivityCount(u));
    }).length;
  }

  window.APP_VIEWS.home = function (root, ctx) {
    var h = ctx.h;
    var cards = Object.keys(ctx.subjects).map(function (key) {
      var s = ctx.subjects[key];
      var units = unitsOf(ctx, key);
      var done = countDone(ctx, units);
      var pct = units.length ? Math.round((done / units.length) * 100) : 0;
      return h('a', { class: 'card subject ' + s.cls, href: ctx.hashOf({ view: 'subject', subject: key, track: s.tracks ? 'geo' : null }) },
        h('h2', null, s.name),
        h('div', { class: 'muted small' }, s.publisher + '版'),
        h('div', { class: 'small', style: { marginTop: '10px' } }, '已完成 ' + done + ' / ' + units.length + ' 個單元'),
        h('div', { class: 'progress-bar', role: 'progressbar', 'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100 },
          h('span', { style: { width: pct + '%' } }))
      );
    });

    root.appendChild(h('div', { class: 'page-head' },
      h('h1', null, '選一個科目開始'),
      h('span', { class: 'muted small' }, '先看重點，再動手操作，最後做題目檢查自己懂了沒。')
    ));
    root.appendChild(h('div', { class: 'grid two' }, cards));
    if (!ctx.store.persistent) {
      root.appendChild(h('p', { class: 'note', style: { marginTop: '16px' } }, '這個瀏覽器無法儲存進度，關閉後會重新開始。'));
    }
  };

  window.APP_VIEWS.notFound = function (root, ctx) {
    var h = ctx.h;
    root.appendChild(h('div', { class: 'card', style: { textAlign: 'center', padding: '40px 20px' } },
      h('h1', null, '找不到這個頁面'),
      h('p', { class: 'muted' }, '網址可能打錯了，或這個單元還沒加進來。'),
      h('a', { class: 'btn primary', href: '#/' }, '回首頁')
    ));
  };
})();
