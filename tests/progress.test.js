const { test } = require('node:test');
const assert = require('node:assert');
const { createProgressStore } = require('../js/progress.js');

const mem = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
    _m: m,
  };
};

test('預設值', () => {
  assert.deepEqual(createProgressStore(mem()).get('u'), {
    conceptsDone: false, activitiesDone: [], bestScore: null, quizTotal: null, attempts: 0, wrongIds: [],
    rightEverIds: [], resolvedCount: 0,
  });
});

test('markConceptsDone', () => {
  const s = createProgressStore(mem());
  s.markConceptsDone('u');
  assert.equal(s.get('u').conceptsDone, true);
});

test('markActivityDone 不重複', () => {
  const s = createProgressStore(mem());
  s.markActivityDone('u', 'a1');
  s.markActivityDone('u', 'a1');
  assert.deepEqual(s.get('u').activitiesDone, ['a1']);
});

test('recordQuiz 更新最高分與錯題集合', () => {
  const s = createProgressStore(mem());
  s.recordQuiz('u', { score: 6, total: 10, wrongIds: ['q1', 'q2'], rightIds: ['q3'] });
  s.recordQuiz('u', { score: 5, total: 10, wrongIds: ['q3'], rightIds: ['q1'] });
  const p = s.get('u');
  assert.equal(p.bestScore, 6);
  assert.equal(p.quizTotal, 10);
  assert.equal(p.attempts, 2);
  assert.deepEqual([...p.wrongIds].sort(), ['q2', 'q3']);
});

test('resolveWrong 移除', () => {
  const s = createProgressStore(mem());
  s.recordQuiz('u', { score: 0, total: 1, wrongIds: ['q1'], rightIds: [] });
  s.resolveWrong('u', 'q1');
  assert.deepEqual(s.get('u').wrongIds, []);
});

test('isUnitDone', () => {
  const s = createProgressStore(mem());
  s.markConceptsDone('u');
  s.markActivityDone('u', 'a1');
  s.markActivityDone('u', 'a2');
  assert.equal(s.isUnitDone('u', 2), false);
  s.recordQuiz('u', { score: 1, total: 1, wrongIds: [], rightIds: ['q1'] });
  assert.equal(s.isUnitDone('u', 2), true);
});

test('寫入 localStorage 鍵與 version', () => {
  const st = mem();
  createProgressStore(st).markConceptsDone('u');
  const raw = JSON.parse(st._m.get('jh-learn-progress'));
  assert.equal(raw.version, 1);
  assert.equal(raw.units.u.conceptsDone, true);
});

test('重新建立 store 會讀回既有進度', () => {
  const st = mem();
  createProgressStore(st).markConceptsDone('u');
  assert.equal(createProgressStore(st).get('u').conceptsDone, true);
});

test('storage 丟例外時仍可用', () => {
  const bad = {
    getItem() { throw new Error('x'); },
    setItem() { throw new Error('x'); },
    removeItem() { throw new Error('x'); },
  };
  const s = createProgressStore(bad);
  s.markConceptsDone('u');
  assert.equal(s.get('u').conceptsDone, true);
  assert.equal(s.persistent, false);
});

test('storage 內容損壞時從空白開始', () => {
  const st = mem();
  st.setItem('jh-learn-progress', '{not json');
  const s = createProgressStore(st);
  assert.equal(s.get('u').conceptsDone, false);
});

test('importJSON 拒絕壞資料且不動原進度', () => {
  const s = createProgressStore(mem());
  s.markConceptsDone('u');
  assert.equal(s.importJSON('not json').ok, false);
  assert.equal(s.importJSON(JSON.stringify({ version: 2, units: {} })).ok, false);
  assert.equal(s.importJSON(JSON.stringify({ version: 1 })).ok, false);
  assert.equal(s.importJSON('[]').ok, false);
  assert.equal(s.get('u').conceptsDone, true);
});

test('export 再 import 還原', () => {
  const a = createProgressStore(mem());
  a.markConceptsDone('u');
  a.recordQuiz('u', { score: 2, total: 3, wrongIds: ['q9'], rightIds: [] });
  const b = createProgressStore(mem());
  assert.equal(b.importJSON(a.exportJSON()).ok, true);
  assert.deepEqual(b.get('u'), a.get('u'));
});

test('clear 清空', () => {
  const st = mem();
  const s = createProgressStore(st);
  s.markConceptsDone('u');
  s.clear();
  assert.equal(s.get('u').conceptsDone, false);
  assert.equal(st._m.has('jh-learn-progress'), false);
});

test('get 回傳的物件修改不影響內部狀態', () => {
  const s = createProgressStore(mem());
  s.get('u').activitiesDone.push('hack');
  assert.deepEqual(s.get('u').activitiesDone, []);
});

test('storage 為 null 時仍可用且 persistent 為 false', () => {
  const s = createProgressStore(null);
  s.markConceptsDone('u');
  assert.equal(s.get('u').conceptsDone, true);
  assert.equal(s.persistent, false);
});

test('validateImport 回報單元數且不改變狀態', () => {
  const a = createProgressStore(mem());
  a.markConceptsDone('x'); a.markConceptsDone('y');
  const text = a.exportJSON();
  const b = createProgressStore(mem());
  b.markConceptsDone('z');
  const r = b.validateImport(text);
  assert.deepEqual(r, { ok: true, unitCount: 2 });
  assert.equal(b.get('z').conceptsDone, true);
  assert.equal(b.get('x').conceptsDone, false);
});

test('validateImport 拒絕壞資料', () => {
  const s = createProgressStore(mem());
  assert.equal(s.validateImport('nope').ok, false);
  assert.equal(s.validateImport(JSON.stringify({ version: 9, units: {} })).ok, false);
});

test('新欄位預設與 player 預設', () => {
  const s = createProgressStore(mem());
  assert.deepEqual(s.get('u').rightEverIds, []);
  assert.equal(s.get('u').resolvedCount, 0);
  assert.deepEqual(s.getPlayer(), { name: '', badgesSeen: [], streak: null, lastUnit: null });
});

test('recordQuiz 累積 rightEverIds，重測不重複', () => {
  const s = createProgressStore(mem());
  s.recordQuiz('u', { score: 1, total: 2, wrongIds: ['q2'], rightIds: ['q1'] });
  s.recordQuiz('u', { score: 1, total: 2, wrongIds: ['q2'], rightIds: ['q1'] });
  assert.deepEqual(s.get('u').rightEverIds, ['q1']);
});

test('resolveWrong 記 resolvedCount 與 rightEverIds', () => {
  const s = createProgressStore(mem());
  s.recordQuiz('u', { score: 0, total: 1, wrongIds: ['q1'], rightIds: [] });
  s.resolveWrong('u', 'q1');
  s.resolveWrong('u', 'q1');
  assert.equal(s.get('u').resolvedCount, 1);
  assert.deepEqual(s.get('u').rightEverIds, ['q1']);
});

test('舊格式匯入補齊新欄位', () => {
  const s = createProgressStore(mem());
  const old = JSON.stringify({ version: 1, units: { u: { conceptsDone: true, activitiesDone: [], bestScore: 3, quizTotal: 3, attempts: 1, wrongIds: [] } } });
  assert.equal(s.importJSON(old).ok, true);
  assert.deepEqual(s.get('u').rightEverIds, []);
  assert.equal(s.get('u').resolvedCount, 0);
  assert.equal(s.getPlayer().name, '');
});

test('player 方法與持久化', () => {
  const st = mem();
  const s = createProgressStore(st);
  s.setName('小明');
  s.setLastUnit('bio-ch1');
  s.touchStreak('2026-10-31');
  s.markBadgesSeen(['first-star']);
  s.markBadgesSeen(['first-star']);
  const p = createProgressStore(st).getPlayer();
  assert.equal(p.name, '小明');
  assert.equal(p.lastUnit, 'bio-ch1');
  assert.deepEqual(p.streak, { count: 1, last: '2026-10-31' });
  assert.deepEqual(p.badgesSeen, ['first-star']);
});

test('allUnits 回副本', () => {
  const s = createProgressStore(mem());
  s.markConceptsDone('u');
  const a = s.allUnits();
  a.u.conceptsDone = false;
  assert.equal(s.get('u').conceptsDone, true);
});

test('clear 連名字一起清', () => {
  const s = createProgressStore(mem());
  s.setName('小明');
  s.clear();
  assert.equal(s.getPlayer().name, '');
});

test('舊格式匯入後等級與徽章可回填', () => {
  const GAME = require('../js/game-logic.js');
  const s = createProgressStore(mem());
  const old = JSON.stringify({ version: 1, units: { 'bio-ch1': { conceptsDone: true, activitiesDone: ['a1', 'a2'], bestScore: 5, quizTotal: 5, attempts: 2, wrongIds: [] } } });
  assert.equal(s.importJSON(old).ok, true);
  const unit = { id: 'bio-ch1', subject: 'bio', activities: [{ id: 'a1' }, { id: 'a2' }], quiz: [{}, {}, {}, {}, {}] };
  assert.equal(GAME.computeStars(s.get('bio-ch1'), unit).flag, true);
  assert.equal(GAME.totalXp(s.allUnits()), 20 + 30 + 30); // rightEverIds 舊檔沒有，不計
  assert.deepEqual(GAME.computeBadges(s.allUnits(), [unit], s.getPlayer().streak), ['first-star', 'first-flag', 'perfect']);
});
