// 啟動：建立 ctx、監聽 hash、分派畫面。
(function () {
  'use strict';

  var SUBJECTS = {
    bio: { name: '生物', publisher: '康軒', cls: 'subject-bio', tracks: null },
    soc: { name: '社會', publisher: '南一', cls: 'subject-soc', tracks: { geo: '地理', hist: '歷史', civ: '公民' } },
  };

  var h = window.APP_UI.h;

  var store = window.APP_PROGRESS.createProgressStore(window.localStorage);
  var root = document.getElementById('app');
  var currentRoute = { view: 'home' };

  var ctx = {
    h: h,
    store: store,
    content: window.APP_CONTENT,
    subjects: SUBJECTS,
    navigate: function (route) { window.APP_ROUTER.navigate(route); },
    hashOf: function (route) { return window.APP_ROUTER.buildHash(route); },
    rerender: function () { render(currentRoute); },
    unitActivityCount: function (unit) { return unit.activities.length; },
  };

  function render(route) {
    currentRoute = route;
    var views = window.APP_VIEWS || {};
    root.innerHTML = '';
    root.className = '';
    window.scrollTo(0, 0);

    if (route.view === 'home') return views.home(root, ctx);
    if (route.view === 'subject') return views.subject(root, ctx, route.subject, route.track);
    if (route.view === 'unit') {
      var unit = ctx.content.get(route.unitId);
      if (unit && views.unit) return views.unit(root, ctx, unit, route.tab);
    }
    return views.notFound(root, ctx);
  }

  document.getElementById('btn-progress').addEventListener('click', function () {
    window.APP_VIEWS.progressDialog(ctx);
  });

  window.APP_ROUTER.onChange(render);
})();
