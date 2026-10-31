const { test } = require('node:test');
const assert = require('node:assert');
const { validateUnit, validateAll } = require('../tools/validate-content.js');
const good = require('./fixtures/good-unit.js');

const clone = (u) => structuredClone(u);
const find = (u, type) => u.activities.find((a) => a.type === type);

test('合法單元沒有錯誤', () => {
  assert.deepEqual(validateUnit(good), []);
});

test('answer 超出 options 範圍', () => {
  const u = clone(good);
  u.quiz[0].answer = 9;
  assert.match(validateUnit(u).join('\n'), /\[test-unit\] 第1題 answer/);
});

test('題目 id 重複', () => {
  const u = clone(good);
  u.quiz[1].id = u.quiz[0].id;
  assert.match(validateUnit(u).join('\n'), /第2題 id 重複/);
});

test('concept 對不到概念卡', () => {
  const u = clone(good);
  u.quiz[0].concept = '不存在';
  assert.match(validateUnit(u).join('\n'), /第1題 concept/);
});

test('match 少於 3 組', () => {
  const u = clone(good);
  find(u, 'match').data.pairs.length = 2;
  assert.match(validateUnit(u).join('\n'), /活動 .* pairs/);
});

test('fill 沒有挖空', () => {
  const u = clone(good);
  find(u, 'fill').data.sentence = '沒有空格';
  assert.match(validateUnit(u).join('\n'), /\[\[/);
});

test('sort 的 bucket 索引超出範圍', () => {
  const u = clone(good);
  find(u, 'sort').data.items[0].bucket = 5;
  assert.match(validateUnit(u).join('\n'), /活動 a-sort .* bucket/);
});

test('label 的 x 超出 0–100', () => {
  const u = clone(good);
  find(u, 'label').data.labels[0].x = 120;
  assert.match(validateUnit(u).join('\n'), /活動 a-label .* x/);
});

test('未知活動型態', () => {
  const u = clone(good);
  u.activities[0].type = 'bogus';
  assert.match(validateUnit(u).join('\n'), /活動 a-match type/);
});

test('社會單元缺 track', () => {
  const u = clone(good);
  u.subject = 'soc';
  assert.match(validateUnit(u).join('\n'), /欄位 track/);
});

test('缺必要欄位', () => {
  const u = clone(good);
  delete u.title;
  assert.match(validateUnit(u).join('\n'), /欄位 title/);
});

test('跨單元 id 重複', () => {
  const errs = validateAll([good, clone(good)]);
  assert.match(errs.join('\n'), /單元 id 重複/);
});
