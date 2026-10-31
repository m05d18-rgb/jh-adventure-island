// 啟動：建立 ctx、監聽 hash、分派畫面。
(function () {
  'use strict';

  var SUBJECTS = {
    bio: { name: '生物', publisher: '康軒', cls: 'subject-bio', tracks: null },
    soc: { name: '社會', publisher: '南一', cls: 'subject-soc', tracks: { geo: '地理', hist: '歷史', civ: '公民' } },
  };

  // 建立 DOM 的小工具：h('div', { class: 'x', onClick: fn }, '文字', childEl, [more])
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'html') el.innerHTML = v;
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      });
    }
    var children = Array.prototype.slice.call(arguments, 2);
    (function append(list) {
      list.forEach(function (c) {
        if (c == null || c === false) return;
        if (Array.isArray(c)) return append(c);
        el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
      });
    })(children);
    return el;
  }

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
