// 進度儲存：把每個單元的學習狀態與玩家資料存在 localStorage（鍵 jh-learn-progress）。
// storage 不可用時改用記憶體，store.persistent 會是 false。
// 瀏覽器端：window.APP_PROGRESS.createProgressStore(window.localStorage)
// Node 端：require 回傳 { createProgressStore }
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./game-logic.js'));
  } else {
    root.APP_PROGRESS = factory(root.APP_GAME);
  }
})(typeof self !== 'undefined' ? self : this, function (GAME) {
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
      rightEverIds: [],   // 曾經答對過的題目（測驗或重練），用來算經驗值、重測不重複給分
      resolvedCount: 0,   // 重練答對而移出錯題本的次數
    };
  }

  function defaultPlayer() {
    return { name: '', badgesSeen: [], streak: null, lastUnit: null };
  }

  function emptyState() {
    return { version: VERSION, units: {}, player: defaultPlayer() };
  }

  function strArray(v) {
    return Array.isArray(v) ? v.map(String) : [];
  }

  function unique(arr) {
    var seen = {};
    return arr.filter(function (x) { if (seen[x]) return false; seen[x] = true; return true; });
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
      d.activitiesDone = strArray(u.activitiesDone);
      d.bestScore = typeof u.bestScore === 'number' ? u.bestScore : null;
      d.quizTotal = typeof u.quizTotal === 'number' ? u.quizTotal : null;
      d.attempts = typeof u.attempts === 'number' ? u.attempts : 0;
      d.wrongIds = strArray(u.wrongIds);
      d.rightEverIds = strArray(u.rightEverIds);
      d.resolvedCount = typeof u.resolvedCount === 'number' ? u.resolvedCount : 0;
      units[id] = d;
    });
    var p = defaultPlayer();
    var src = data.player && typeof data.player === 'object' ? data.player : {};
    p.name = typeof src.name === 'string' ? src.name.slice(0, 12) : '';
    p.badgesSeen = unique(strArray(src.badgesSeen));
    p.streak = src.streak && typeof src.streak.count === 'number' && typeof src.streak.last === 'string'
      ? { count: src.streak.count, last: src.streak.last } : null;
    p.lastUnit = typeof src.lastUnit === 'string' ? src.lastUnit : null;
    return { ok: true, state: { version: VERSION, units: units, player: p } };
  }

  function createProgressStore(storage) {
    var state = emptyState();
    var persistent = !!storage;

    function load() {
      if (!storage) return;
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
      if (!storage) return;
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
      // ---- 單元 ----
      get: function (id) {
        return clone(state.units[id] || defaultUnit());
      },
      allUnits: function () {
        return clone(state.units);
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
        u.rightEverIds = unique(u.rightEverIds.concat(right));
        save();
      },
      resolveWrong: function (id, questionId) {
        var u = unit(id);
        var was = u.wrongIds.indexOf(questionId) !== -1;
        u.wrongIds = u.wrongIds.filter(function (q) { return q !== questionId; });
        if (was) {
          u.resolvedCount += 1;
          u.rightEverIds = unique(u.rightEverIds.concat([questionId]));
        }
        save();
      },
      isUnitDone: function (id, activityCount) {
        var u = state.units[id];
        if (!u) return false;
        return u.conceptsDone && u.activitiesDone.length >= activityCount && u.bestScore !== null;
      },

      // ---- 玩家 ----
      getPlayer: function () {
        return clone(state.player);
      },
      setName: function (name) {
        state.player.name = String(name || '').trim().slice(0, 12);
        save();
      },
      setLastUnit: function (unitId) {
        state.player.lastUnit = unitId || null;
        save();
      },
      touchStreak: function (today) {
        state.player.streak = GAME.touchStreak(state.player.streak, today);
        save();
        return clone(state.player.streak);
      },
      markBadgesSeen: function (ids) {
        state.player.badgesSeen = unique(state.player.badgesSeen.concat(ids || []));
        save();
      },

      // ---- 匯出 / 匯入 / 清除 ----
      exportJSON: function () {
        return JSON.stringify(state, null, 2);
      },
      // 只檢查不套用，供匯入前的確認畫面使用
      validateImport: function (text) {
        var parsed = parseState(text);
        if (!parsed.ok) return { ok: false, reason: parsed.reason };
        return { ok: true, unitCount: Object.keys(parsed.state.units).length };
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
        if (!storage) return;
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
