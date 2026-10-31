// 建立 DOM 的小工具，所有畫面與活動共用。
// h('div', { class: 'x', onClick: fn, dataset: { id: 1 } }, '文字', childEl, [more...])
(function () {
  'use strict';
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
  window.APP_UI = { h: h };
})();
