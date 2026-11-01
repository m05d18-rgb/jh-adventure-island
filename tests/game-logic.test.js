const { test } = require('node:test');
const assert = require('node:assert');
const { computeStars, unitXp, totalXp, levelFor, BADGES, computeBadges, touchStreak, dayDiff, todayStr } = require('../js/game-logic.js');

const unit = { id: 'u', subject: 'bio', activities: [{ id: 'a1' }, { id: 'a2' }], quiz: [{}, {}, {}, {}, {}] };
const st = (o) => Object.assign({ conceptsDone: false, activitiesDone: [], bestScore: null, quizTotal: null, attempts: 0, wrongIds: [], rightEverIds: [], resolvedCount: 0 }, o);

test('三星與金旗', () => {
  assert.deepEqual(computeStars(st({}), unit), { concepts: false, activities: false, quiz: false, count: 0, flag: false });
  const s = computeStars(st({ conceptsDone: true, activitiesDone: ['a1', 'a2'], bestScore: 4, quizTotal: 5 }), unit);
  assert.equal(s.count, 3);
  assert.equal(s.flag, true);
  assert.equal(computeStars(st({ bestScore: 3, quizTotal: 5 }), unit).quiz, false);
  assert.equal(computeStars(st({ activitiesDone: ['a1'] }), unit).activities, false);
});

test('unitXp 公式', () => {
  assert.equal(unitXp(st({})), 0);
  assert.equal(unitXp(st({ conceptsDone: true, activitiesDone: ['a1'], rightEverIds: ['q1', 'q2'], bestScore: 4, quizTotal: 5, resolvedCount: 1 })), 20 + 15 + 10 + 30 + 10);
  assert.equal(unitXp(st({ bestScore: 3, quizTotal: 5, rightEverIds: ['q1'] })), 5);
});

test('totalXp 加總', () => {
  assert.equal(totalXp({ a: st({ conceptsDone: true }), b: st({ conceptsDone: true }) }), 40);
});

test('levelFor', () => {
  assert.deepEqual(levelFor(0), { level: 1, xp: 0, levelStart: 0, nextAt: 60 });
  assert.equal(levelFor(60).level, 2);
  assert.equal(levelFor(239).level, 2);
  assert.equal(levelFor(240).level, 3);
  assert.deepEqual(levelFor(100), { level: 2, xp: 100, levelStart: 60, nextAt: 240 });
});

test('BADGES 八個固定 id', () => {
  assert.deepEqual(BADGES.map((b) => b.id), ['first-star', 'first-flag', 'perfect', 'clean-book', 'streak-3', 'streak-7', 'bio-all', 'soc-all']);
  BADGES.forEach((b) => { assert.ok(b.name && b.desc); });
});

test('徽章：first-star / first-flag / perfect / clean-book / bio-all', () => {
  const units = [unit];
  assert.deepEqual(computeBadges({ u: st({}) }, units, null), []);
  assert.deepEqual(computeBadges({ u: st({ conceptsDone: true }) }, units, null), ['first-star']);
  const full = st({ conceptsDone: true, activitiesDone: ['a1', 'a2'], bestScore: 5, quizTotal: 5, resolvedCount: 1, wrongIds: [] });
  assert.deepEqual(computeBadges({ u: full }, units, null), ['first-star', 'first-flag', 'perfect', 'clean-book']);
  const notClean = st({ resolvedCount: 1, wrongIds: ['q9'] });
  assert.ok(!computeBadges({ u: notClean }, units, null).includes('clean-book'));
});

test('徽章：streak 與 soc-all', () => {
  const soc = [{ id: 's1', subject: 'soc', activities: [], quiz: [{}] }, { id: 's2', subject: 'soc', activities: [], quiz: [{}] }];
  const done = st({ conceptsDone: true, bestScore: 1, quizTotal: 1 });
  assert.ok(computeBadges({ s1: done, s2: done }, soc, { count: 3 }).includes('streak-3'));
  assert.ok(!computeBadges({ s1: done, s2: done }, soc, { count: 3 }).includes('streak-7'));
  assert.ok(computeBadges({ s1: done, s2: done }, soc, { count: 7 }).includes('streak-7'));
  assert.ok(computeBadges({ s1: done, s2: done }, soc, null).includes('soc-all'));
  assert.ok(!computeBadges({ s1: done, s2: done }, soc, null).includes('bio-all'));
});

test('dayDiff 與 touchStreak', () => {
  assert.equal(dayDiff('2026-10-31', '2026-11-01'), 1);
  assert.equal(dayDiff('2026-12-31', '2027-01-01'), 1);
  assert.equal(dayDiff('2026-10-31', '2026-10-31'), 0);
  assert.deepEqual(touchStreak(null, '2026-10-31'), { count: 1, last: '2026-10-31' });
  assert.deepEqual(touchStreak({ count: 2, last: '2026-10-31' }, '2026-10-31'), { count: 2, last: '2026-10-31' });
  assert.deepEqual(touchStreak({ count: 2, last: '2026-10-31' }, '2026-11-01'), { count: 3, last: '2026-11-01' });
  assert.deepEqual(touchStreak({ count: 5, last: '2026-10-29' }, '2026-10-31'), { count: 1, last: '2026-10-31' });
});

test('todayStr 格式', () => {
  assert.match(todayStr(new Date(2026, 0, 5)), /^2026-01-05$/);
});

test('bio-all / soc-all 需要該科至少 2 座島', () => {
  const full = st({ conceptsDone: true, activitiesDone: ['a1', 'a2'], bestScore: 5, quizTotal: 5 });
  assert.ok(!computeBadges({ u: full }, [unit], null).includes('bio-all'));
  const unit2 = Object.assign({}, unit, { id: 'u2' });
  assert.ok(computeBadges({ u: full, u2: full }, [unit, unit2], null).includes('bio-all'));
  assert.ok(!computeBadges({ u: full }, [unit, unit2], null).includes('bio-all'));
});

test('mergeBadges 保留曾獲得的徽章並依固定順序', () => {
  const { mergeBadges } = require('../js/game-logic.js');
  assert.deepEqual(mergeBadges(['first-star'], ['streak-7', 'first-star']), ['first-star', 'streak-7']);
  assert.deepEqual(mergeBadges([], []), []);
  assert.deepEqual(mergeBadges(['perfect'], ['bogus']), ['perfect']);
});

test('currentStreak 中斷後顯示 0', () => {
  const { currentStreak } = require('../js/game-logic.js');
  assert.equal(currentStreak(null, '2026-10-31'), 0);
  assert.equal(currentStreak({ count: 5, last: '2026-10-31' }, '2026-10-31'), 5);
  assert.equal(currentStreak({ count: 5, last: '2026-10-30' }, '2026-10-31'), 5);
  assert.equal(currentStreak({ count: 5, last: '2026-10-28' }, '2026-10-31'), 0);
});

test('unlockedMap：每條路線第一關開、通過 BOSS 才解鎖下一關', () => {
  const { unlockedMap } = require('../js/game-logic.js');
  const mk = (id, subject, track, order) => ({ id, subject, track, order, activities: [], quiz: [{}, {}, {}, {}, {}] });
  const units = [mk('b1', 'bio', null, 1), mk('b2', 'bio', null, 2), mk('b3', 'bio', null, 3), mk('g1', 'soc', 'geo', 1), mk('g2', 'soc', 'geo', 2)];
  const pass = st({ bestScore: 4, quizTotal: 5 });
  const fail = st({ bestScore: 3, quizTotal: 5 });
  assert.deepEqual(unlockedMap(units, {}, false), { b1: true, b2: false, b3: false, g1: true, g2: false });
  assert.deepEqual(unlockedMap(units, { b1: pass }, false), { b1: true, b2: true, b3: false, g1: true, g2: false });
  assert.deepEqual(unlockedMap(units, { b1: fail }, false), { b1: true, b2: false, b3: false, g1: true, g2: false });
  assert.deepEqual(unlockedMap(units, { b1: pass, b2: pass }, false), { b1: true, b2: true, b3: true, g1: true, g2: false });
  assert.deepEqual(unlockedMap(units, {}, true), { b1: true, b2: true, b3: true, g1: true, g2: true });
});

test('BOSS 戰：血量、愛心、連擊與失敗', () => {
  const { newFight, applyAnswer } = require('../js/game-logic.js');
  let f = newFight(12);
  assert.deepEqual(f, { hp: 12, maxHp: 12, hearts: 3, maxHearts: 3, combo: 0, maxCombo: 0, failed: false });
  assert.equal(newFight(10).hearts, 3);
  assert.equal(newFight(8).hearts, 2);
  f = applyAnswer(f, true); f = applyAnswer(f, true);
  assert.equal(f.hp, 10); assert.equal(f.combo, 2); assert.equal(f.maxCombo, 2);
  f = applyAnswer(f, false);
  assert.equal(f.hp, 10); assert.equal(f.hearts, 2); assert.equal(f.combo, 0); assert.equal(f.maxCombo, 2); assert.equal(f.failed, false);
  f = applyAnswer(f, false); f = applyAnswer(f, false);
  assert.equal(f.hearts, 0); assert.equal(f.failed, true);
  // 失敗後不再變動
  const g = applyAnswer(f, true);
  assert.equal(g.hp, 10); assert.equal(g.failed, true);
});
