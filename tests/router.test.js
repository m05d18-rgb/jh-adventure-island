const { test } = require('node:test');
const assert = require('node:assert');
const { parseHash, buildHash } = require('../js/router.js');

const cases = [
  ['', { view: 'home' }],
  ['#', { view: 'home' }],
  ['#/', { view: 'home' }],
  ['#/bio', { view: 'subject', subject: 'bio', track: null }],
  ['#/soc', { view: 'subject', subject: 'soc', track: 'geo' }],
  ['#/soc/hist', { view: 'subject', subject: 'soc', track: 'hist' }],
  ['#/soc/civ', { view: 'subject', subject: 'soc', track: 'civ' }],
  ['#/unit/bio-ch1', { view: 'unit', unitId: 'bio-ch1', tab: 'concepts' }],
  ['#/unit/bio-ch1/quiz', { view: 'unit', unitId: 'bio-ch1', tab: 'quiz' }],
  ['#/unit/bio-ch1/wrong', { view: 'unit', unitId: 'bio-ch1', tab: 'wrong' }],
  ['#/unit/bio-ch1/bogus', { view: 'notfound' }],
  ['#/unit', { view: 'notfound' }],
  ['#/soc/xyz', { view: 'notfound' }],
  ['#/bio/geo', { view: 'notfound' }],
  ['#/whatever', { view: 'notfound' }],
];

for (const [hash, expected] of cases) {
  test(`parseHash(${JSON.stringify(hash)})`, () => {
    assert.deepEqual(parseHash(hash), expected);
  });
}

test('buildHash 反向', () => {
  for (const h of ['#/', '#/bio', '#/soc/hist', '#/unit/bio-ch1/quiz']) {
    assert.equal(buildHash(parseHash(h)), h);
  }
  assert.equal(buildHash({ view: 'subject', subject: 'soc', track: 'geo' }), '#/soc/geo');
  assert.equal(buildHash({ view: 'unit', unitId: 'x' }), '#/unit/x/concepts');
});
