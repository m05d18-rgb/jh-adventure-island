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
    var st = window.APP_GAME.computeStars(p, unit);

    return h('a', { class: 'card unit', href: ctx.hashOf({ view: 'unit', unitId: unit.id }) },
      h('h3', null, unit.title, ' ', window.APP_MASCOT.starsEl(st, { small: true })),
      h('div', { class: 'muted small' }, unit.summary),
      h('div', { class: 'status' },
        statusItem(h, st.concepts ? '✓' : '○', '重點', st.concepts),
        statusItem(h, st.activities ? '✓' : '○', '活動 ' + actDone + '/' + total, st.activities),
        statusItem(h, st.quiz ? '✓' : '○', '測驗 ' + quizText, st.quiz)
      )
    );
  }

  window.APP_VIEWS.subject = function (root, ctx, subject, track) {
    var h = ctx.h;
    var s = ctx.subjects[subject];
    root.className = s.cls;

    var allUnits = s.tracks
      ? Object.keys(s.tracks).reduce(function (acc, t) { return acc.concat(ctx.content.list(subject, t)); }, [])
      : ctx.content.list(subject, null);
    var starSum = allUnits.reduce(function (n, u) { return n + window.APP_GAME.computeStars(ctx.store.get(u.id), u).count; }, 0);
    root.appendChild(h('div', { class: 'page-head' },
      h('a', { class: 'back-link', href: '#/' }, '← 冒險地圖'),
      h('h1', null, s.name),
      h('span', { class: 'muted small' }, s.publisher + '版・★ ' + starSum + ' / ' + allUnits.length * 3)
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
