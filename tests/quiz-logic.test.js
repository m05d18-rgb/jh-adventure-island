const { test } = require('node:test');
const assert = require('node:assert');
const { scoreQuiz, groupByConcept, shuffle } = require('../js/quiz-logic.js');

const qs = [
  { id: 'q1', concept: 'A', answer: 0 },
  { id: 'q2', concept: 'B', answer: 1 },
  { id: 'q3', concept: 'A', answer: 2 },
];

test('scoreQuiz 計分、錯題與未作答', () => {
  const r = scoreQuiz(qs, { q1: 0, q2: 0 });
  assert.equal(r.score, 1);
  assert.equal(r.total, 3);
  assert.deepEqual(r.wrongIds, ['q2', 'q3']);
  assert.deepEqual(r.rightIds, ['q1']);
  assert.deepEqual(r.results[0], { id: 'q1', correct: true, chosen: 0, answer: 0 });
  assert.equal(r.results[2].chosen, null);
  assert.equal(r.results[2].correct, false);
});

test('groupByConcept 只含指定題目、依首次出現排序', () => {
  const g = groupByConcept(qs, ['q3', 'q2']);
  assert.deepEqual(g.map((x) => [x.concept, x.questions.map((q) => q.id)]), [['A', ['q3']], ['B', ['q2']]]);
});

test('groupByConcept 空清單', () => {
  assert.deepEqual(groupByConcept(qs, []), []);
});

test('shuffle 不改原陣列且為排列', () => {
  const a = [1, 2, 3, 4];
  const b = shuffle(a, () => 0.5);
  assert.deepEqual(a, [1, 2, 3, 4]);
  assert.deepEqual([...b].sort(), a);
});

test('shuffle 給定 rng 時結果可重現', () => {
  let i = 0;
  const seq = [0.1, 0.9, 0.3, 0.7];
  const rng = () => seq[i++ % seq.length];
  i = 0; const x = shuffle([1, 2, 3, 4], rng);
  i = 0; const y = shuffle([1, 2, 3, 4], rng);
  assert.deepEqual(x, y);
});
