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
  assert.deepEqual(computeBadges({ u: full }, units, null), ['first-star', 'first-flag', 'perfect', 'clean-book', 'bio-all']);
  const notClean = st({ resolvedCount: 1, wrongIds: ['q9'] });
  assert.ok(!computeBadges({ u: notClean }, units, null).includes('clean-book'));
});

test('徽章：streak 與 soc-all', () => {
  const soc = [{ id: 's1', subject: 'soc', activities: [], quiz: [{}] }];
  const done = st({ conceptsDone: true, bestScore: 1, quizTotal: 1 });
  assert.ok(computeBadges({ s1: done }, soc, { count: 3 }).includes('streak-3'));
  assert.ok(!computeBadges({ s1: done }, soc, { count: 3 }).includes('streak-7'));
  assert.ok(computeBadges({ s1: done }, soc, { count: 7 }).includes('streak-7'));
  assert.ok(computeBadges({ s1: done }, soc, null).includes('soc-all'));
  assert.ok(!computeBadges({ s1: done }, soc, null).includes('bio-all'));
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
