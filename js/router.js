// Hash 路由：#/、#/bio、#/soc/<track>、#/unit/<id>/<tab>
// 瀏覽器端：window.APP_ROUTER；Node 端：require 回傳同物件（無 onChange）。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.APP_ROUTER = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var TRACKS = ['geo', 'hist', 'civ'];
  var TABS = ['concepts', 'activities', 'quiz', 'wrong'];
  var NOT_FOUND = { view: 'notfound' };

  function parseHash(hash) {
    var h = (hash || '').replace(/^#/, '');
    var parts = h.split('/').filter(Boolean);
    if (parts.length === 0) return { view: 'home' };

    if (parts[0] === 'bio') {
      return parts.length === 1 ? { view: 'subject', subject: 'bio', track: null } : NOT_FOUND;
    }
    if (parts[0] === 'soc') {
      if (parts.length === 1) return { view: 'subject', subject: 'soc', track: 'geo' };
      if (parts.length === 2 && TRACKS.indexOf(parts[1]) !== -1) {
        return { view: 'subject', subject: 'soc', track: parts[1] };
      }
      return NOT_FOUND;
    }
    if (parts[0] === 'unit') {
      if (parts.length === 2) return { view: 'unit', unitId: parts[1], tab: 'concepts' };
      if (parts.length === 3 && TABS.indexOf(parts[2]) !== -1) {
        return { view: 'unit', unitId: parts[1], tab: parts[2] };
      }
      return NOT_FOUND;
    }
    return NOT_FOUND;
  }

  function buildHash(route) {
    switch (route.view) {
      case 'subject':
        return route.subject === 'bio' ? '#/bio' : '#/soc/' + (route.track || 'geo');
      case 'unit':
        return '#/unit/' + route.unitId + '/' + (route.tab || 'concepts');
      default:
        return '#/';
    }
  }

  var api = { parseHash: parseHash, buildHash: buildHash, TABS: TABS, TRACKS: TRACKS };

  if (typeof window !== 'undefined' && window.addEventListener) {
    api.onChange = function (handler) {
      var fire = function () { handler(parseHash(window.location.hash)); };
      window.addEventListener('hashchange', fire);
      fire();
    };
    api.navigate = function (route) {
      window.location.hash = buildHash(route);
    };
  }

  return api;
});
