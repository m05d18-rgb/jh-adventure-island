// 科目頁：單元清單；社會有地理/歷史/公民三個分頁。
(function () {
  'use strict';
  window.APP_VIEWS = window.APP_VIEWS || {};

  function statusItem(h, icon, text, done) {
    return h('span', { class: 'status-item' + (done ? ' done' : '') },
      h('span', { 'aria-hidden': 'true' }, icon), text);
  }

  function unitCard(ctx, unit) {
    var h = ctx.h;
    var p = ctx.store.get(unit.id);
    var total = ctx.unitActivityCount(unit);
    var actDone = p.activitiesDone.length;
    var quizText = p.bestScore == null ? '—' : p.bestScore + ' / ' + p.quizTotal;
    var allDone = ctx.store.isUnitDone(unit.id, total);

    return h('a', { class: 'card unit', href: ctx.hashOf({ view: 'unit', unitId: unit.id }) },
      h('h3', null, unit.title, allDone ? h('span', { class: 'badge ok', style: { marginLeft: '8px' } }, '✓ 完成') : null),
      h('div', { class: 'muted small' }, unit.summary),
      h('div', { class: 'status' },
        statusItem(h, p.conceptsDone ? '✓' : '○', '重點', p.conceptsDone),
        statusItem(h, actDone >= total && total > 0 ? '✓' : '○', '活動 ' + actDone + '/' + total, actDone >= total && total > 0),
        statusItem(h, p.bestScore != null ? '✓' : '○', '測驗 ' + quizText, p.bestScore != null)
      )
    );
  }

  window.APP_VIEWS.subject = function (root, ctx, subject, track) {
    var h = ctx.h;
    var s = ctx.subjects[subject];
    root.className = s.cls;

    root.appendChild(h('div', { class: 'page-head' },
      h('a', { class: 'back-link', href: '#/' }, '← 首頁'),
      h('h1', null, s.name),
      h('span', { class: 'muted small' }, s.publisher + '版')
    ));

    if (s.tracks) {
      root.appendChild(h('div', { class: 'tabs', role: 'tablist' },
        Object.keys(s.tracks).map(function (t) {
          return h('button', {
            type: 'button', role: 'tab', 'aria-selected': t === track ? 'true' : 'false',
            onClick: function () { ctx.navigate({ view: 'subject', subject: subject, track: t }); },
          }, s.tracks[t]);
        })
      ));
    }

    var units = ctx.content.list(subject, track);
    if (!units.length) {
      root.appendChild(h('div', { class: 'empty' }, '尚無單元'));
      return;
    }
    root.appendChild(h('div', { class: 'grid' }, units.map(function (u) { return unitCard(ctx, u); })));
  };
})();
