// 獎勵純邏輯：星星、金旗、經驗值、等級、徽章、連續天數。全部由進度狀態推算。
// 瀏覽器端：window.APP_GAME；Node 端：require 回傳同物件。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.APP_GAME = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var PASS_RATIO = 0.8;
  var XP = { concepts: 20, activity: 15, rightAnswer: 5, pass: 30, resolved: 10 };
  var LEVEL_BASE = 60;

  function quizPassed(s) {
    return s.quizTotal > 0 && s.bestScore != null && s.bestScore / s.quizTotal >= PASS_RATIO;
  }

  function computeStars(s, unit) {
    var concepts = !!s.conceptsDone;
    var total = unit.activities ? unit.activities.length : 0;
    var activities = (s.activitiesDone || []).length >= total; // 沒有活動的單元視為已完成
    var quiz = quizPassed(s);
    var count = (concepts ? 1 : 0) + (activities ? 1 : 0) + (quiz ? 1 : 0);
    return { concepts: concepts, activities: activities, quiz: quiz, count: count, flag: count === 3 };
  }

  function unitXp(s) {
    var xp = 0;
    if (s.conceptsDone) xp += XP.concepts;
    xp += (s.activitiesDone || []).length * XP.activity;
    xp += (s.rightEverIds || []).length * XP.rightAnswer;
    if (quizPassed(s)) xp += XP.pass;
    xp += (s.resolvedCount || 0) * XP.resolved;
    return xp;
  }

  function totalXp(statesById) {
    return Object.keys(statesById || {}).reduce(function (sum, id) { return sum + unitXp(statesById[id]); }, 0);
  }

  function levelFor(xp) {
    var level = Math.floor(Math.sqrt(xp / LEVEL_BASE)) + 1;
    return {
      level: level,
      xp: xp,
      levelStart: LEVEL_BASE * (level - 1) * (level - 1),
      nextAt: LEVEL_BASE * level * level,
    };
  }

  var BADGES = [
    { id: 'first-star', name: '第一顆星', desc: '在任何一座島拿到第一顆星' },
    { id: 'first-flag', name: '第一面金旗', desc: '把一座島的三顆星集滿' },
    { id: 'perfect', name: '全對！', desc: '任何一次測驗拿到滿分' },
    { id: 'clean-book', name: '錯題清零', desc: '把一座島的錯題本重練到空' },
    { id: 'streak-3', name: '連續三天', desc: '連續 3 天都有學習紀錄' },
    { id: 'streak-7', name: '連續七天', desc: '連續 7 天都有學習紀錄' },
    { id: 'bio-all', name: '生物島主', desc: '生物區所有島都升起金旗' },
    { id: 'soc-all', name: '社會島主', desc: '社會區所有島都升起金旗' },
  ];

  function computeBadges(statesById, units, streak) {
    statesById = statesById || {};
    units = units || [];
    var anyStar = false, anyFlag = false, perfect = false, clean = false;
    var bySubject = { bio: { n: 0, flags: 0 }, soc: { n: 0, flags: 0 } };

    units.forEach(function (u) {
      var s = statesById[u.id];
      var sub = bySubject[u.subject];
      if (sub) sub.n += 1;
      if (!s) return;
      var stars = computeStars(s, u);
      if (stars.count > 0) anyStar = true;
      if (stars.flag) { anyFlag = true; if (sub) sub.flags += 1; }
      if (s.quizTotal > 0 && s.bestScore === s.quizTotal) perfect = true;
      if ((s.resolvedCount || 0) > 0 && (s.wrongIds || []).length === 0) clean = true;
    });

    var count = streak && streak.count ? streak.count : 0;
    var earned = {
      'first-star': anyStar,
      'first-flag': anyFlag,
      'perfect': perfect,
      'clean-book': clean,
      'streak-3': count >= 3,
      'streak-7': count >= 7,
      // 「島主」要該科至少 2 座島，避免第一面金旗就順便拿到、之後加單元又被收回
      'bio-all': bySubject.bio.n >= 2 && bySubject.bio.flags === bySubject.bio.n,
      'soc-all': bySubject.soc.n >= 2 && bySubject.soc.flags === bySubject.soc.n,
    };
    return BADGES.filter(function (b) { return earned[b.id]; }).map(function (b) { return b.id; });
  }

  // 顯示用：曾經拿到的徽章不會被收回（computed ∪ seen），依 BADGES 順序
  function mergeBadges(computed, seen) {
    var set = {};
    (computed || []).concat(seen || []).forEach(function (id) { set[id] = true; });
    return BADGES.filter(function (b) { return set[b.id]; }).map(function (b) { return b.id; });
  }

  // 顯示用：連續天數若已中斷（上次紀錄距今超過 1 天）顯示 0
  function currentStreak(streak, today) {
    if (!streak || !streak.last) return 0;
    return dayDiff(streak.last, today) > 1 ? 0 : streak.count;
  }

  // ---- 闖關：依序解鎖 ----
  // 每條路線（bio / geo / hist / civ）第 1 關永遠開；通過上一關的 BOSS（測驗 ≥ 80%）才解鎖下一關。
  function chainOf(u) { return u.subject === 'bio' ? 'bio' : u.track; }

  function unlockedMap(units, statesById, unlockAll) {
    statesById = statesById || {};
    var chains = {};
    (units || []).forEach(function (u) {
      var c = chainOf(u);
      (chains[c] = chains[c] || []).push(u);
    });
    var result = {};
    Object.keys(chains).forEach(function (c) {
      var list = chains[c].slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
      var open = true;
      list.forEach(function (u) {
        result[u.id] = !!unlockAll || open;
        var s = statesById[u.id];
        open = !!(s && quizPassed(s));
      });
    });
    return result;
  }

  // ---- BOSS 戰 ----
  function newFight(total) {
    var hearts = Math.floor(total * (1 - PASS_RATIO) + 1e-9) + 1;
    return { hp: total, maxHp: total, hearts: hearts, maxHearts: hearts, combo: 0, maxCombo: 0, failed: false };
  }

  function applyAnswer(fight, correct) {
    if (fight.failed) return fight;
    var f = Object.assign({}, fight);
    if (correct) {
      f.hp = Math.max(0, f.hp - 1);
      f.combo += 1;
      f.maxCombo = Math.max(f.maxCombo, f.combo);
    } else {
      f.hearts = Math.max(0, f.hearts - 1);
      f.combo = 0;
      if (f.hearts === 0) f.failed = true;
    }
    return f;
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function todayStr(date) {
    var d = date || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  // 以 UTC 解析 'YYYY-MM-DD'，避免夏令時間造成的非整數天
  function dayDiff(a, b) {
    var pa = a.split('-').map(Number), pb = b.split('-').map(Number);
    var ta = Date.UTC(pa[0], pa[1] - 1, pa[2]);
    var tb = Date.UTC(pb[0], pb[1] - 1, pb[2]);
    return Math.round((tb - ta) / 86400000);
  }

  function touchStreak(streak, today) {
    if (!streak || !streak.last) return { count: 1, last: today };
    var diff = dayDiff(streak.last, today);
    if (diff === 0) return { count: streak.count, last: streak.last };
    if (diff === 1) return { count: streak.count + 1, last: today };
    return { count: 1, last: today };
  }

  return {
    PASS_RATIO: PASS_RATIO,
    XP: XP,
    computeStars: computeStars,
    unitXp: unitXp,
    totalXp: totalXp,
    levelFor: levelFor,
    BADGES: BADGES,
    computeBadges: computeBadges,
    mergeBadges: mergeBadges,
    currentStreak: currentStreak,
    unlockedMap: unlockedMap,
    newFight: newFight,
    applyAnswer: applyAnswer,
    touchStreak: touchStreak,
    dayDiff: dayDiff,
    todayStr: todayStr,
  };
});
