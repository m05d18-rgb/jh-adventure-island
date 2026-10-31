const { test } = require('node:test');
const assert = require('node:assert');
const { layoutIslands, nearestIslandForPlayer } = require('../js/map/layout.js');

const units = [
  { id: 'b1', subject: 'bio', track: null, order: 1 },
  { id: 'b2', subject: 'bio', track: null, order: 2 },
  { id: 'g1', subject: 'soc', track: 'geo', order: 1 },
  { id: 'h1', subject: 'soc', track: 'hist', order: 1 },
  { id: 'c1', subject: 'soc', track: 'civ', order: 1 },
];

test('每島一個位置、無重疊、帶 chain 與 index', () => {
  const r = layoutIslands(units);
  assert.equal(r.islands.length, 5);
  const keys = new Set(r.islands.map((i) => i.x + ',' + i.z));
  assert.equal(keys.size, 5);
  const b2 = r.islands.find((i) => i.id === 'b2');
  assert.equal(b2.chain, 'bio');
  assert.equal(b2.index, 1);
  assert.equal(b2.unit.id, 'b2');
  assert.ok(r.bounds.minX < r.bounds.maxX && r.bounds.minZ <= r.bounds.maxZ);
});

test('橋只連同鏈相鄰', () => {
  const r = layoutIslands(units);
  assert.deepEqual(r.bridges, [{ from: 'b1', to: 'b2' }]);
});

test('生物在左、社會在右，三條社會鏈 z 不同', () => {
  const r = layoutIslands(units);
  const by = (id) => r.islands.find((i) => i.id === id);
  assert.ok(by('b1').x < by('g1').x);
  const zs = new Set([by('g1').z, by('h1').z, by('c1').z]);
  assert.equal(zs.size, 3);
});

test('蛇形：第 7 座在第二排且 x 反向', () => {
  const many = Array.from({ length: 8 }, (_, i) => ({ id: 'b' + i, subject: 'bio', track: null, order: i + 1 }));
  const r = layoutIslands(many, { perRow: 6, gap: 8, rowGap: 9 });
  const row0 = r.islands.slice(0, 6), row1 = r.islands.slice(6);
  assert.ok(row1.every((i) => i.z === row0[0].z + 9));
  assert.equal(row1[0].x, row0[5].x);
  assert.equal(row1[1].x, row0[4].x);
  assert.equal(r.bridges.length, 7);
});

test('nearestIslandForPlayer', () => {
  const unitsFull = units.map((u) => Object.assign({ activities: [], quiz: [{}] }, u));
  const r = layoutIslands(unitsFull);
  const flag = { conceptsDone: true, activitiesDone: [], bestScore: 1, quizTotal: 1, wrongIds: [], rightEverIds: [], resolvedCount: 0 };
  assert.equal(nearestIslandForPlayer(r.islands, { b1: flag }, null).id, 'b2');
  assert.equal(nearestIslandForPlayer(r.islands, {}, 'g1').id, 'g1');
  assert.equal(nearestIslandForPlayer(r.islands, { g1: flag }, 'g1').id, 'b1');
  const all = { b1: flag, b2: flag, g1: flag, h1: flag, c1: flag };
  assert.equal(nearestIslandForPlayer(r.islands, all, null).id, 'c1');
});
