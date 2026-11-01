#!/usr/bin/env node
// 驗證單一內容檔（不經 manifest）：node tools/validate-file.js content/bio/ch2.js [more files...]
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const createRegistry = require('../js/content-registry.js');
const { validateUnit } = require('./validate-content.js');

let bad = 0;
process.argv.slice(2).forEach((rel) => {
  const file = path.resolve(process.cwd(), rel);
  const reg = createRegistry();
  try {
    vm.runInNewContext(fs.readFileSync(file, 'utf8'), { window: { APP_CONTENT: reg } }, { filename: rel });
  } catch (e) {
    console.error(`✗ ${rel} 載入失敗：${e.message}`);
    bad += 1;
    return;
  }
  const units = reg.all();
  if (units.length !== 1) { console.error(`✗ ${rel} 應該剛好登記 1 個單元，實際 ${units.length}`); bad += 1; return; }
  const errors = validateUnit(units[0]);
  const u = units[0];
  const stats = `${u.concepts.length} 卡 / ${u.activities.length} 活動 / ${u.quiz.length} 題`;
  if (errors.length) {
    console.error(`✗ ${rel}（${stats}）`);
    errors.forEach((e) => console.error('   ' + e));
    bad += 1;
  } else {
    console.log(`✓ ${rel}（${stats}）`);
  }
});
process.exit(bad ? 1 : 0);
