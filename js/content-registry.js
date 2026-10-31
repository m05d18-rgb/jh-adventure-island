// 內容登記：各內容檔呼叫 window.APP_CONTENT.register(unit) 把自己登記進來。
// 瀏覽器端：window.APP_CONTENT 是已建立的登記簿。
// Node 端：require 回傳工廠 createRegistry()，供驗證腳本與測試使用。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.APP_CONTENT = factory()();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var TRACK_ORDER = { geo: 0, hist: 1, civ: 2 };

  function createRegistry() {
    var units = [];

    function sortKey(u) {
      var s = u.subject === 'bio' ? 0 : 1;
      var t = u.track ? TRACK_ORDER[u.track] : 0;
      return [s, t, u.order || 0];
    }

    function compare(a, b) {
      var ka = sortKey(a), kb = sortKey(b);
      for (var i = 0; i < ka.length; i++) {
        if (ka[i] !== kb[i]) return ka[i] - kb[i];
      }
      return 0;
    }

    return {
      register: function (unit) {
        units.push(unit);
      },
      all: function () {
        return units.slice().sort(compare);
      },
      get: function (id) {
        return units.find(function (u) { return u.id === id; });
      },
      list: function (subject, track) {
        return units
          .filter(function (u) {
            return u.subject === subject && (subject === 'bio' || u.track === track);
          })
          .sort(compare);
      },
    };
  }

  return createRegistry;
});
