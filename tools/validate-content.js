#!/usr/bin/env node
// 內容檔驗證：檢查每個單元的欄位是否齊全、題目與活動資料是否合法。
// 用法：npm run validate
// 錯誤訊息格式：[單元id] 第N題 欄位 問題 / [單元id] 活動 活動id 欄位 問題 / [單元id] 欄位 名稱 問題

'use strict';

const ACTIVITY_TYPES = ['match', 'sort', 'sequence', 'fill', 'label', 'flashcard'];
const TRACKS = ['geo', 'hist', 'civ'];

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function isArray(v, min) {
  return Array.isArray(v) && v.length >= (min || 0);
}

function validateActivityData(prefix, type, data, errors) {
  if (!data || typeof data !== 'object') {
    errors.push(`${prefix} data 必須是物件`);
    return;
  }
  switch (type) {
    case 'match':
      if (!isArray(data.pairs, 3)) errors.push(`${prefix} pairs 至少要 3 組`);
      else data.pairs.forEach((p, i) => {
        if (!p || !isNonEmptyString(p.left) || !isNonEmptyString(p.right)) {
          errors.push(`${prefix} pairs 第${i + 1}組缺 left 或 right`);
        }
      });
      break;
    case 'sort':
      if (!isArray(data.buckets, 2)) errors.push(`${prefix} buckets 至少要 2 個`);
      if (!isArray(data.items, 2)) errors.push(`${prefix} items 至少要 2 個`);
      else data.items.forEach((it, i) => {
        if (!it || !isNonEmptyString(it.text)) errors.push(`${prefix} items 第${i + 1}個缺 text`);
        const n = Array.isArray(data.buckets) ? data.buckets.length : 0;
        if (!it || !Number.isInteger(it.bucket) || it.bucket < 0 || it.bucket >= n) {
          errors.push(`${prefix} items 第${i + 1}個 bucket 超出範圍（0–${n - 1}）`);
        }
      });
      break;
    case 'sequence':
      if (!isNonEmptyString(data.prompt)) errors.push(`${prefix} prompt 不可空白`);
      if (!isArray(data.items, 3)) errors.push(`${prefix} items 至少要 3 個`);
      else data.items.forEach((it, i) => {
        if (!isNonEmptyString(it)) errors.push(`${prefix} items 第${i + 1}個不可空白`);
      });
      break;
    case 'fill': {
      if (!isNonEmptyString(data.sentence)) errors.push(`${prefix} sentence 不可空白`);
      else {
        const blanks = data.sentence.match(/\[\[([^\]]+)\]\]/g) || [];
        if (blanks.length < 1) errors.push(`${prefix} sentence 至少要有一個 [[答案]] 挖空`);
      }
      if (!Array.isArray(data.distractors)) errors.push(`${prefix} distractors 必須是陣列（可為空）`);
      break;
    }
    case 'label':
      if (!isNonEmptyString(data.svg) || !/<svg[\s>]/.test(data.svg)) errors.push(`${prefix} svg 必須是 <svg> 字串`);
      if (!isArray(data.labels, 2)) errors.push(`${prefix} labels 至少要 2 個`);
      else data.labels.forEach((l, i) => {
        if (!l || !isNonEmptyString(l.text)) errors.push(`${prefix} labels 第${i + 1}個缺 text`);
        ['x', 'y'].forEach((k) => {
          if (!l || typeof l[k] !== 'number' || l[k] < 0 || l[k] > 100) {
            errors.push(`${prefix} labels 第${i + 1}個 ${k} 必須是 0–100 的數字`);
          }
        });
      });
      break;
    case 'flashcard':
      if (!isArray(data.cards, 3)) errors.push(`${prefix} cards 至少要 3 張`);
      else data.cards.forEach((c, i) => {
        if (!c || !isNonEmptyString(c.front) || !isNonEmptyString(c.back)) {
          errors.push(`${prefix} cards 第${i + 1}張缺 front 或 back`);
        }
      });
      break;
    default:
      break;
  }
}

function validateUnit(unit) {
  const errors = [];
  if (!unit || typeof unit !== 'object') return ['單元必須是物件'];
  const id = isNonEmptyString(unit.id) ? unit.id : '?';
  const P = `[${id}]`;

  ['id', 'title', 'publisher', 'summary'].forEach((k) => {
    if (!isNonEmptyString(unit[k])) errors.push(`${P} 欄位 ${k} 不可空白`);
  });
  if (unit.subject !== 'bio' && unit.subject !== 'soc') errors.push(`${P} 欄位 subject 必須是 "bio" 或 "soc"`);
  if (unit.subject === 'soc' && !TRACKS.includes(unit.track)) errors.push(`${P} 欄位 track 社會單元必須是 "geo"、"hist" 或 "civ"`);
  if (unit.subject === 'bio' && unit.track != null) errors.push(`${P} 欄位 track 生物單元必須是 null`);
  if (typeof unit.order !== 'number') errors.push(`${P} 欄位 order 必須是數字`);

  // 概念卡
  const conceptTitles = new Set();
  if (!isArray(unit.concepts, 1)) errors.push(`${P} 欄位 concepts 至少要 1 張概念卡`);
  else unit.concepts.forEach((c, i) => {
    const n = i + 1;
    if (!c || !isNonEmptyString(c.title)) errors.push(`${P} 概念卡 第${n}張 title 不可空白`);
    else {
      if (conceptTitles.has(c.title)) errors.push(`${P} 概念卡 第${n}張 title 重複`);
      conceptTitles.add(c.title);
    }
    if (!c || !isNonEmptyString(c.body)) errors.push(`${P} 概念卡 第${n}張 body 不可空白`);
    if (!c || !Array.isArray(c.keywords)) errors.push(`${P} 概念卡 第${n}張 keywords 必須是陣列（可為空）`);
  });

  // 活動
  const activityIds = new Set();
  if (!isArray(unit.activities, 1)) errors.push(`${P} 欄位 activities 至少要 1 個活動`);
  else unit.activities.forEach((a, i) => {
    const aid = a && isNonEmptyString(a.id) ? a.id : `#${i + 1}`;
    const prefix = `${P} 活動 ${aid}`;
    if (!a || !isNonEmptyString(a.id)) errors.push(`${prefix} id 不可空白`);
    else {
      if (activityIds.has(a.id)) errors.push(`${prefix} id 重複`);
      activityIds.add(a.id);
    }
    if (!a || !isNonEmptyString(a.title)) errors.push(`${prefix} title 不可空白`);
    if (!a || !ACTIVITY_TYPES.includes(a.type)) {
      errors.push(`${prefix} type 必須是 ${ACTIVITY_TYPES.join('、')} 其中之一`);
    } else {
      validateActivityData(prefix, a.type, a.data, errors);
    }
  });

  // 測驗
  const quizIds = new Set();
  if (!isArray(unit.quiz, 1)) errors.push(`${P} 欄位 quiz 至少要 1 題`);
  else unit.quiz.forEach((q, i) => {
    const n = i + 1;
    const prefix = `${P} 第${n}題`;
    if (!q || !isNonEmptyString(q.id)) errors.push(`${prefix} id 不可空白`);
    else {
      if (quizIds.has(q.id)) errors.push(`${prefix} id 重複`);
      quizIds.add(q.id);
    }
    if (!q || !isNonEmptyString(q.concept)) errors.push(`${prefix} concept 不可空白`);
    else if (!conceptTitles.has(q.concept)) errors.push(`${prefix} concept「${q.concept}」對不到任何概念卡標題`);
    if (!q || !isNonEmptyString(q.question)) errors.push(`${prefix} question 不可空白`);
    if (!q || !isArray(q.options, 2)) errors.push(`${prefix} options 至少要 2 個`);
    else {
      q.options.forEach((o, j) => {
        if (!isNonEmptyString(o)) errors.push(`${prefix} options 第${j + 1}個不可空白`);
      });
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) {
        errors.push(`${prefix} answer 必須是 0–${q.options.length - 1} 的索引`);
      }
    }
    if (!q || !isNonEmptyString(q.explanation)) errors.push(`${prefix} explanation 不可空白`);
  });

  return errors;
}

function validateAll(units) {
  const errors = [];
  const seen = new Set();
  units.forEach((u) => {
    errors.push(...validateUnit(u));
    if (u && isNonEmptyString(u.id)) {
      if (seen.has(u.id)) errors.push(`單元 id 重複：${u.id}`);
      seen.add(u.id);
    }
  });
  return errors;
}

function loadFromManifest(rootDir) {
  const fs = require('fs');
  const path = require('path');
  const vm = require('vm');
  const createRegistry = require('../js/content-registry.js');
  const window = { APP_CONTENT: createRegistry(), APP_MANIFEST: [] };
  const run = (rel) => {
    const file = path.join(rootDir, rel);
    const code = fs.readFileSync(file, 'utf8');
    vm.runInNewContext(code, { window }, { filename: rel });
  };
  run('content/manifest.js');
  window.APP_MANIFEST.forEach(run);
  return window.APP_CONTENT.all();
}

module.exports = { validateUnit, validateAll, loadFromManifest };

if (require.main === module) {
  const path = require('path');
  const root = path.join(__dirname, '..');
  let units;
  try {
    units = loadFromManifest(root);
  } catch (e) {
    console.error(`✗ 載入內容檔失敗：${e.message}`);
    process.exit(1);
  }
  const errors = validateAll(units);
  if (errors.length) {
    console.error(`✗ 發現 ${errors.length} 個問題：`);
    errors.forEach((e) => console.error('  ' + e));
    process.exit(1);
  }
  console.log(`✓ 內容檔 ${units.length} 個，全部合法`);
}
