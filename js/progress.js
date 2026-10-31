// 進度儲存：把每個單元的學習狀態存在 localStorage（鍵 jh-learn-progress）。
// storage 不可用時改用記憶體，store.persistent 會是 false。
// 瀏覽器端：window.APP_PROGRESS.createProgressStore(window.localStorage)
// Node 端：require 回傳 { createProgressStore }
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.APP_PROGRESS = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var KEY = 'jh-learn-progress';
  var VERSION = 1;

  function defaultUnit() {
    return {
      conceptsDone: false,
      activitiesDone: [],
      bestScore: null,
      quizTotal: null,
      attempts: 0,
      wrongIds: [],
    };
  }

  function emptyState() {
    return { version: VERSION, units: {} };
  }

  function parseState(text) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return { ok: false, reason: '不是有效的 JSON 檔' };
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { ok: false, reason: '格式不正確' };
    }
    if (data.version !== VERSION) {
      return { ok: false, reason: '版本不符（需要 version ' + VERSION + '）' };
    }
    if (!data.units || typeof data.units !== 'object' || Array.isArray(data.units)) {
      return { ok: false, reason: '缺少 units 資料' };
    }
    var units = {};
    Object.keys(data.units).forEach(function (id) {
      var u = data.units[id] || {};
      var d = defaultUnit();
      d.conceptsDone = !!u.conceptsDone;
      d.activitiesDone = Array.isArray(u.activitiesDone) ? u.activitiesDone.map(String) : [];
      d.bestScore = typeof u.bestScore === 'number' ? u.bestScore : null;
      d.quizTotal = typeof u.quizTotal === 'number' ? u.quizTotal : null;
      d.attempts = typeof u.attempts === 'number' ? u.attempts : 0;
      d.wrongIds = Array.isArray(u.wrongIds) ? u.wrongIds.map(String) : [];
      units[id] = d;
    });
    return { ok: true, state: { version: VERSION, units: units } };
  }

  function createProgressStore(storage) {
    var state = emptyState();
    var persistent = true;

    function load() {
      var raw = null;
      try {
        raw = storage.getItem(KEY);
      } catch (e) {
        persistent = false;
        return;
      }
      if (raw == null) return;
      var parsed = parseState(raw);
      if (parsed.ok) state = parsed.state;
    }

    function save() {
      try {
        storage.setItem(KEY, JSON.stringify(state));
      } catch (e) {
        persistent = false;
      }
    }

    function unit(id) {
      if (!state.units[id]) state.units[id] = defaultUnit();
      return state.units[id];
    }

    function clone(u) {
      return JSON.parse(JSON.stringify(u));
    }

    load();

    var store = {
      get: function (id) {
        return clone(state.units[id] || defaultUnit());
      },
      markConceptsDone: function (id) {
        unit(id).conceptsDone = true;
        save();
      },
      markActivityDone: function (id, activityId) {
        var u = unit(id);
        if (u.activitiesDone.indexOf(activityId) === -1) u.activitiesDone.push(activityId);
        save();
      },
      recordQuiz: function (id, result) {
        var u = unit(id);
        var score = result.score, total = result.total;
        var wrong = result.wrongIds || [], right = result.rightIds || [];
        u.bestScore = u.bestScore == null ? score : Math.max(u.bestScore, score);
        u.quizTotal = total;
        u.attempts += 1;
        var set = {};
        u.wrongIds.concat(wrong).forEach(function (q) { set[q] = true; });
        right.forEach(function (q) { delete set[q]; });
        u.wrongIds = Object.keys(set);
        save();
      },
      resolveWrong: function (id, questionId) {
        var u = unit(id);
        u.wrongIds = u.wrongIds.filter(function (q) { return q !== questionId; });
        save();
      },
      isUnitDone: function (id, activityCount) {
        var u = state.units[id];
        if (!u) return false;
        return u.conceptsDone && u.activitiesDone.length >= activityCount && u.bestScore !== null;
      },
      exportJSON: function () {
        return JSON.stringify(state, null, 2);
      },
      importJSON: function (text) {
        var parsed = parseState(text);
        if (!parsed.ok) return { ok: false, reason: parsed.reason };
        state = parsed.state;
        save();
        return { ok: true };
      },
      clear: function () {
        state = emptyState();
        try {
          storage.removeItem(KEY);
        } catch (e) {
          persistent = false;
        }
      },
    };

    Object.defineProperty(store, 'persistent', {
      get: function () { return persistent; },
      enumerable: true,
    });

    return store;
  }

  return { createProgressStore: createProgressStore };
});
