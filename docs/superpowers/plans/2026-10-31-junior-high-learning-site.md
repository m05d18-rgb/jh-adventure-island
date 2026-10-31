# 國一生物與社會互動自學網站 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一個純靜態的互動自學網站，國一生物（康軒）與社會（南一）各單元提供「重點整理 → 互動活動 → 測驗 → 錯題本」，進度存在瀏覽器。

**Architecture:** 單一 `index.html` 以 hash 路由切換首頁、科目頁、單元頁。內容為傳統 `<script>` 載入的 `.js` 資料檔，各自呼叫 `window.APP_CONTENT.register()`。純邏輯（進度、計分、驗證）寫成 UMD 風格模組，瀏覽器與 Node 都能載入，用 `node:test` 測試。六種活動元件共用一個拖曳/點選輔助模組。

**Tech Stack:** HTML、CSS、vanilla JavaScript（ES2020，傳統 script，無 module、無 fetch）、Node 18+ 內建 `node:test` 與 `vm`（只用於測試與驗證腳本）。

**Spec:** `docs/superpowers/specs/2026-10-31-junior-high-learning-site-design.md`

## Global Constraints

- 不用任何框架、打包工具、npm 相依套件；`package.json` 只放 `scripts`。
- 必須能在 `file://` 直接開啟：不用 `fetch()`、不用 `<script type="module">`、不用 `import`。
- 外部資源只允許 Google Fonts，且字型載入失敗不影響功能。
- 繁體中文介面與內容；內容原創，不抄錄課本。
- 每個內容檔第一行註解：`// 本單元內容為原創撰寫，請對照課本校對後使用`。
- 進度存在 `localStorage` 鍵 `jh-learn-progress`，格式含 `version: 1`。
- 所有拖曳互動同時支援 Pointer 拖曳與「先點項目再點目標」的點選模式；放置區最小 44px。
- 淺色/深色模式跟隨系統；狀態同時用顏色與圖示表示。
- 每題解析寫「為什麼對」與「其他選項為什麼錯」；每題有 `concept` 對應某張概念卡標題。
- 每次任務完成後 commit。

## Review Focus

1. `localStorage` 不可用或丟出例外（無痕模式、配額滿）：網站仍可完整使用，只是不記進度。→ Task 2 測試。
2. 匯入格式錯誤或 `version` 不符的進度檔：拒絕並顯示訊息，原進度不動。→ Task 2 測試。
3. 內容檔題目 `answer` 超出 `options` 範圍、`id` 重複、`concept` 對不到概念卡：驗證腳本指出單元、題號、欄位。→ Task 1 測試。
4. 錯題本中的題目重測答對後應移出，答錯仍在；新錯題加入時不覆蓋舊的。→ Task 3 測試。
5. 網址 hash 指向不存在的單元或科目：顯示「找不到」並提供回首頁連結，不噴錯。→ Task 4 測試。

---

## File Structure

```
index.html                     入口；載入 css、js、content/manifest.js 與各內容檔
css/styles.css                 全站樣式（變數、淺深色、版面、元件、活動）
js/content-registry.js         window.APP_CONTENT：register / all / get / list
js/progress.js                 window.APP_PROGRESS.createProgressStore(storage)（UMD）
js/quiz-logic.js               window.APP_QUIZ：scoreQuiz / groupByConcept / shuffle（UMD）
js/router.js                   window.APP_ROUTER.parseHash(hash)（UMD）/ onChange
js/dnd.js                      window.APP_DND：拖曳與點選模式輔助
js/activities/match.js         配對
js/activities/sort.js          分類
js/activities/sequence.js      排序
js/activities/fill.js          填空
js/activities/label.js         圖片標示
js/activities/flashcard.js     翻牌
js/views/home.js               首頁
js/views/subject.js            科目頁（含社會三分頁）
js/views/unit.js               單元頁四個分頁
js/views/progress-dialog.js    進度匯出/匯入/清除
js/app.js                      啟動：建立 store、監聽 hash、分派 view
content/manifest.js            window.APP_MANIFEST = [內容檔路徑...]
content/bio/ch1.js             康軒生物 第1章
content/soc/geo/l1.js          南一地理 第1課
content/soc/hist/l1.js         南一歷史 第1課
content/soc/civ/l1.js          南一公民 第1課
tools/validate-content.js      Node：載入 manifest 與內容檔，輸出錯誤
tests/*.test.js                node:test
docs/content-format.md         內容檔撰寫範本
package.json                   scripts: test / validate
```

---

### Task 1: 專案骨架、內容登記與驗證腳本

**Files:**
- Create: `package.json`, `.gitignore`, `js/content-registry.js`, `tools/validate-content.js`, `content/manifest.js`, `content/_example.js`, `docs/content-format.md`
- Test: `tests/validate-content.test.js`

**Interfaces:**
- Produces: `window.APP_CONTENT` (UMD，Node 下 `require` 回傳同物件工廠 `createRegistry()`)：
  - `register(unit)`、`all()` → 依 `subject, track, order` 排序的陣列、`get(id)` → unit 或 `undefined`、`list(subject, track)` → 陣列
- Produces: `tools/validate-content.js` 匯出 `validateUnit(unit, index) → string[]`（錯誤訊息陣列，空陣列代表合法）與 `validateAll(units) → string[]`（含跨單元 id 重複檢查）；直接執行時讀 `content/manifest.js`，用 `vm` 以 `{ window: { APP_CONTENT, APP_MANIFEST } }` 為 context 載入每個檔案，印出錯誤並以 exit code 1 結束。
- 活動 `data` 結構（驗證腳本依此檢查，活動元件依此讀取）：
  - `match`: `{ pairs: [{ left, right }] }`，至少 3 組
  - `sort`: `{ buckets: [string], items: [{ text, bucket: number }] }`，`bucket` 為 buckets 索引
  - `sequence`: `{ prompt, items: [string] }`，items 為正確順序，至少 3 個
  - `fill`: `{ sentence: string, distractors: [string] }`，挖空以 `[[答案]]` 標記，至少 1 個
  - `label`: `{ svg: string, labels: [{ text, x, y }] }`，x、y 為 0–100 的百分比
  - `flashcard`: `{ cards: [{ front, back }] }`，至少 3 張
- 單元必要欄位：`id, subject("bio"|"soc"), track(bio 為 null；soc 為 "geo"|"hist"|"civ"), order(number), title, publisher, summary, concepts[≥1 {title, body, keywords[]}], activities[≥1 {id, type, title, data}], quiz[≥1 {id, concept, question, options[≥2], answer(index), explanation}]`。

- [ ] **Step 1: 初始化 git 與 package.json**

```bash
git init
```
`package.json`：`{"name":"jh-learn","private":true,"scripts":{"test":"node --test tests/","validate":"node tools/validate-content.js"}}`。`.gitignore` 含 `node_modules/`、`.DS_Store`、`Thumbs.db`。

- [ ] **Step 2: 寫失敗的測試** `tests/validate-content.test.js`

```js
const { test } = require('node:test');
const assert = require('node:assert');
const { validateUnit, validateAll } = require('../tools/validate-content.js');
const good = require('./fixtures/good-unit.js'); // 一個合法單元物件，含六種活動各一

test('合法單元沒有錯誤', () => assert.deepEqual(validateUnit(good), []));
test('answer 超出 options 範圍', () => {
  const u = structuredClone(good); u.quiz[0].answer = 9;
  assert.match(validateUnit(u).join('\n'), /\[test-unit\] 第1題 answer/);
});
test('題目 id 重複', () => {
  const u = structuredClone(good); u.quiz[1].id = u.quiz[0].id;
  assert.match(validateUnit(u).join('\n'), /第2題 id 重複/);
});
test('concept 對不到概念卡', () => {
  const u = structuredClone(good); u.quiz[0].concept = '不存在';
  assert.match(validateUnit(u).join('\n'), /第1題 concept/);
});
test('match 少於 3 組', () => {
  const u = structuredClone(good); u.activities.find(a => a.type === 'match').data.pairs.length = 2;
  assert.match(validateUnit(u).join('\n'), /活動 .* pairs/);
});
test('fill 沒有挖空', () => {
  const u = structuredClone(good); u.activities.find(a => a.type === 'fill').data.sentence = '沒有空格';
  assert.match(validateUnit(u).join('\n'), /\[\[/);
});
test('跨單元 id 重複', () => {
  const errs = validateAll([good, structuredClone(good)]);
  assert.match(errs.join('\n'), /單元 id 重複/);
});
```
同時建立 `tests/fixtures/good-unit.js`（`module.exports = {...}`，id 為 `test-unit`，quiz 至少 2 題）。

- [ ] **Step 3: 執行測試確認失敗**

Run: `npm test`
Expected: FAIL，`Cannot find module '../tools/validate-content.js'`

- [ ] **Step 4: 實作 `js/content-registry.js`**

UMD 包裝：`(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.APP_CONTENT = factory()(); })(this, function () { return function createRegistry() { ... }; });`
Node 端取得的是工廠；瀏覽器端 `window.APP_CONTENT` 是已建立的實例。

- [ ] **Step 5: 實作 `tools/validate-content.js`**

`validateUnit(unit)` 逐欄位檢查，訊息格式：`[${unit.id || '?'}] 第${n}題 ${欄位} ${問題}`、`[${id}] 活動 ${activity.id} ${欄位} ${問題}`、`[${id}] 欄位 ${name} ${問題}`。`validateAll(units)` 先各自 `validateUnit`，再檢查 `id` 重複：`單元 id 重複：${id}`。
`if (require.main === module)` 區塊：讀 `content/manifest.js` 與各檔案以 `vm.runInNewContext` 執行，context 為 `{ window }`，其中 `window.APP_CONTENT = createRegistry()`；結束後 `validateAll(window.APP_CONTENT.all())`，有錯印出並 `process.exit(1)`，無錯印 `✓ 內容檔 ${n} 個，全部合法`。

- [ ] **Step 6: 執行測試確認通過**

Run: `npm test`
Expected: 全部 PASS

- [ ] **Step 7: 建立 `content/manifest.js`、`content/_example.js`、`docs/content-format.md`**

`manifest.js`：`window.APP_MANIFEST = ["content/_example.js"];`
`_example.js`：第一行校對註解；`window.APP_CONTENT.register({...})`，一個示範單元 `id: "example"`, `subject: "bio"`, `track: null`，六種活動各一、quiz 3 題，每個欄位後加中文註解說明用途。
`docs/content-format.md`：欄位說明表、六種活動 data 結構與範例、「新增單元三步驟」（複製 `_example.js`、改內容、加進 `manifest.js`、跑 `npm run validate`）。

- [ ] **Step 8: 執行驗證腳本**

Run: `npm run validate`
Expected: `✓ 內容檔 1 個，全部合法`

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: project skeleton, content registry and validator"
```

---

### Task 2: 進度儲存模組

**Files:**
- Create: `js/progress.js`
- Test: `tests/progress.test.js`

**Interfaces:**
- Produces: `window.APP_PROGRESS.createProgressStore(storage)`（UMD；Node 下 `require` 回傳 `{ createProgressStore }`）。`storage` 需有 `getItem(key)`、`setItem(key, value)`、`removeItem(key)`；任一方法丟出例外時，store 改用記憶體並把 `store.persistent` 設為 `false`。
- Store 方法：
  - `get(unitId)` → `{ conceptsDone: boolean, activitiesDone: string[], bestScore: number|null, quizTotal: number|null, attempts: number, wrongIds: string[] }`（未存在時回預設值）
  - `markConceptsDone(unitId)`
  - `markActivityDone(unitId, activityId)`（不重複加入）
  - `recordQuiz(unitId, { score, total, wrongIds, rightIds })`：`bestScore = max`、`quizTotal = total`、`attempts += 1`、`wrongIds = (舊 wrongIds ∪ wrongIds) − rightIds`
  - `resolveWrong(unitId, questionId)`：從 `wrongIds` 移除
  - `isUnitDone(unitId, activityCount)` → `conceptsDone && activitiesDone.length >= activityCount && bestScore !== null`
  - `exportJSON()` → 字串；`importJSON(text)` → `{ ok: true }` 或 `{ ok: false, reason: string }`（JSON 解析失敗、非物件、`version !== 1`、缺 `units` 都拒絕且不改變現有資料）
  - `clear()`
- 儲存鍵：`jh-learn-progress`；寫入內容：`{ version: 1, units: {...} }`。

- [ ] **Step 1: 寫失敗的測試** `tests/progress.test.js`

```js
const { test } = require('node:test');
const assert = require('node:assert');
const { createProgressStore } = require('../js/progress.js');
const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k), _m: m }; };

test('預設值', () => assert.deepEqual(createProgressStore(mem()).get('u'), { conceptsDone: false, activitiesDone: [], bestScore: null, quizTotal: null, attempts: 0, wrongIds: [] }));
test('markActivityDone 不重複', () => { const s = createProgressStore(mem()); s.markActivityDone('u', 'a1'); s.markActivityDone('u', 'a1'); assert.deepEqual(s.get('u').activitiesDone, ['a1']); });
test('recordQuiz 更新最高分與錯題集合', () => {
  const s = createProgressStore(mem());
  s.recordQuiz('u', { score: 6, total: 10, wrongIds: ['q1', 'q2'], rightIds: ['q3'] });
  s.recordQuiz('u', { score: 5, total: 10, wrongIds: ['q3'], rightIds: ['q1'] });
  const p = s.get('u');
  assert.equal(p.bestScore, 6); assert.equal(p.attempts, 2);
  assert.deepEqual(p.wrongIds.sort(), ['q2', 'q3']);
});
test('resolveWrong 移除', () => { const s = createProgressStore(mem()); s.recordQuiz('u', { score: 0, total: 1, wrongIds: ['q1'], rightIds: [] }); s.resolveWrong('u', 'q1'); assert.deepEqual(s.get('u').wrongIds, []); });
test('isUnitDone', () => { const s = createProgressStore(mem()); s.markConceptsDone('u'); s.markActivityDone('u', 'a1'); s.markActivityDone('u', 'a2'); assert.equal(s.isUnitDone('u', 2), false); s.recordQuiz('u', { score: 1, total: 1, wrongIds: [], rightIds: ['q1'] }); assert.equal(s.isUnitDone('u', 2), true); });
test('寫入 localStorage 鍵與 version', () => { const st = mem(); createProgressStore(st).markConceptsDone('u'); const raw = JSON.parse(st._m.get('jh-learn-progress')); assert.equal(raw.version, 1); assert.equal(raw.units.u.conceptsDone, true); });
test('storage 丟例外時仍可用', () => { const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } }; const s = createProgressStore(bad); s.markConceptsDone('u'); assert.equal(s.get('u').conceptsDone, true); assert.equal(s.persistent, false); });
test('importJSON 拒絕壞資料且不動原進度', () => {
  const s = createProgressStore(mem()); s.markConceptsDone('u');
  assert.equal(s.importJSON('not json').ok, false);
  assert.equal(s.importJSON(JSON.stringify({ version: 2, units: {} })).ok, false);
  assert.equal(s.importJSON(JSON.stringify({ version: 1 })).ok, false);
  assert.equal(s.get('u').conceptsDone, true);
});
test('export 再 import 還原', () => { const a = createProgressStore(mem()); a.markConceptsDone('u'); const b = createProgressStore(mem()); assert.equal(b.importJSON(a.exportJSON()).ok, true); assert.equal(b.get('u').conceptsDone, true); });
```

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test`
Expected: FAIL，找不到 `../js/progress.js`

- [ ] **Step 3: 實作 `js/progress.js`**

UMD 包裝同 Task 1。內部保留一份 `state` 物件，每次變更後 `save()`，`save/load` 以 try/catch 包住 storage 呼叫。

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add js/progress.js tests/progress.test.js
git commit -m "feat: progress store with export/import"
```

---

### Task 3: 測驗計分與路由邏輯

**Files:**
- Create: `js/quiz-logic.js`, `js/router.js`
- Test: `tests/quiz-logic.test.js`, `tests/router.test.js`

**Interfaces:**
- Produces `window.APP_QUIZ`（UMD）：
  - `scoreQuiz(questions, answers)`：`answers` 為 `{ [questionId]: chosenIndex }`；回 `{ score, total, wrongIds, rightIds, results: [{ id, correct, chosen, answer }] }`，未作答視為錯。
  - `groupByConcept(questions, ids)` → `[{ concept, questions: [...] }]`，只含 `ids` 中的題目，依題目原順序；concept 順序依首次出現。
  - `shuffle(array, rng = Math.random)` → 新陣列（Fisher–Yates）。
- Produces `window.APP_ROUTER`（UMD）：
  - `parseHash(hash)` → `{ view: 'home' }` | `{ view: 'subject', subject, track }` | `{ view: 'unit', unitId, tab }` | `{ view: 'notfound' }`。
    規則：`''`/`#`/`#/` → home；`#/bio` → subject bio, track null；`#/soc` → subject soc, track `'geo'`；`#/soc/hist` → track hist；`#/unit/<id>` → unit，tab 預設 `'concepts'`；`#/unit/<id>/<tab>`，tab 僅允許 `concepts|activities|quiz|wrong`；其餘 → notfound。
  - `buildHash(route)` 反向。
  - `onChange(handler)`：綁定 `hashchange` 並立即呼叫一次（瀏覽器端才有）。

- [ ] **Step 1: 寫失敗的測試**

`tests/quiz-logic.test.js`：
```js
const qs = [{ id: 'q1', concept: 'A', answer: 0 }, { id: 'q2', concept: 'B', answer: 1 }, { id: 'q3', concept: 'A', answer: 2 }];
test('scoreQuiz', () => { const r = scoreQuiz(qs, { q1: 0, q2: 0 }); assert.equal(r.score, 1); assert.equal(r.total, 3); assert.deepEqual(r.wrongIds, ['q2', 'q3']); assert.deepEqual(r.rightIds, ['q1']); assert.equal(r.results[2].chosen, null); });
test('groupByConcept', () => assert.deepEqual(groupByConcept(qs, ['q3', 'q2']).map(g => [g.concept, g.questions.map(q => q.id)]), [['A', ['q3']], ['B', ['q2']]]));
test('shuffle 不改原陣列且為排列', () => { const a = [1, 2, 3, 4]; const b = shuffle(a, () => 0.5); assert.deepEqual(a, [1, 2, 3, 4]); assert.deepEqual([...b].sort(), a); });
```
`tests/router.test.js`：對上述每條規則各一個 `assert.deepEqual(parseHash(x), y)`，含 `#/unit/bio-ch1/bogus` → notfound、`#/soc/xyz` → notfound，以及 `buildHash(parseHash(h)) === h` 對 `#/soc/hist`、`#/unit/bio-ch1/quiz`。

- [ ] **Step 2: 執行測試確認失敗**

Run: `npm test`
Expected: FAIL，找不到模組

- [ ] **Step 3: 實作 `js/quiz-logic.js` 與 `js/router.js`**

兩者 UMD 包裝。`onChange` 只在 `typeof window !== 'undefined'` 時定義。

- [ ] **Step 4: 執行測試確認通過**

Run: `npm test`
Expected: 全部 PASS

- [ ] **Step 5: Commit**

```bash
git add js/quiz-logic.js js/router.js tests/
git commit -m "feat: quiz scoring and hash router"
```

---

### Task 4: 頁面殼層、首頁與科目頁

**Files:**
- Create: `index.html`, `css/styles.css`, `js/views/home.js`, `js/views/subject.js`, `js/views/progress-dialog.js`, `js/app.js`

**Interfaces:**
- Consumes: `APP_CONTENT.list/get/all`、`APP_PROGRESS.createProgressStore(window.localStorage)`、`APP_ROUTER.parseHash/buildHash/onChange`。
- Produces：
  - `window.APP_VIEWS.home(root, ctx)`、`APP_VIEWS.subject(root, ctx, subject, track)`、`APP_VIEWS.notFound(root, ctx)`、`APP_VIEWS.progressDialog(ctx)`（開啟對話框）。
  - `ctx = { store, content: APP_CONTENT, navigate(route), h(tag, attrs, ...children) }`，`h` 為建立 DOM 的小工具（定義在 `app.js`，所有 view 共用）。
  - `app.js`：載入後建立 `ctx`，`APP_ROUTER.onChange` 依 route 清空 `#app` 並呼叫對應 view；`unit` route 先呼叫 `APP_VIEWS.unit`（Task 6 實作，此處先呼叫，不存在時顯示 notFound）。
- 科目常數（放 `app.js`）：`SUBJECTS = { bio: { name: '生物', publisher: '康軒', color: '--c-bio' }, soc: { name: '社會', publisher: '南一', color: '--c-soc', tracks: { geo: '地理', hist: '歷史', civ: '公民' } } }`。
- `index.html` script 順序：`content-registry → progress → quiz-logic → router → dnd → activities/* → views/* → content/manifest.js → (動態) 各內容檔 → app.js`。內容檔以 `document.write` 依 `APP_MANIFEST` 逐一寫入 `<script src>`（在 `app.js` 之前的一段 inline script），確保同步載入。

- [ ] **Step 1: 建立 `css/styles.css`**

CSS 變數：`--bg, --fg, --card, --muted, --border, --c-bio(#2e8b57 系), --c-soc(#d2691e 系), --ok(綠), --bad(紅), --radius: 12px`；`@media (prefers-color-scheme: dark)` 覆寫。基礎：`body` 字體 `"Noto Sans TC", system-ui, sans-serif`、最大寬 860px 置中、側邊 16px；`.card`、`.btn`、`.tabs`、`.badge`、`.progress-bar`、拖曳相關 `.drag-item`、`.drop-zone`（min-height 44px）、`.selected`、`.correct`、`.wrong`。

- [ ] **Step 2: 建立 `index.html`**

`<head>`：viewport、`<title>國一自學站</title>`、Google Fonts Noto Sans TC（`<link rel="preconnect">` + stylesheet）、`css/styles.css`。`<body>`：`<header>`（站名連回 `#/`、右側「進度」按鈕 id `btn-progress`）、`<main id="app">`、依上述順序的 script。

- [ ] **Step 3: 實作 `js/app.js`、`js/views/home.js`、`js/views/subject.js`、`js/views/progress-dialog.js`**

- `home`：兩張科目卡（名稱、出版社、`已完成 n / 總數 m` 進度條），點擊 `navigate({view:'subject', subject, track})`。
- `subject`：標題列；`soc` 時三個分頁按鈕（`aria-selected`）切換 track（改 hash）；單元卡片列出 `list(subject, track)`，每張顯示 `title`、`summary`、三個狀態圖示（重點 ✓/○、活動 `done/total`、測驗 `bestScore/quizTotal` 或 `—`），點擊到 `#/unit/<id>`。
- `notFound`：「找不到這個頁面」＋回首頁連結。
- `progressDialog`：原生 `<dialog>`；三個按鈕：匯出（`Blob` 下載 `jh-learn-progress.json`）、匯入（`<input type=file>` → `FileReader` → `store.importJSON`，失敗 `alert(reason)`，成功後重新渲染）、清除（`confirm('確定清除全部進度？')`）。若 `store.persistent === false` 顯示提示「此瀏覽器無法儲存進度」。

- [ ] **Step 4: 瀏覽器驗證**

用內建瀏覽器開啟 `index.html`（file://）：首頁兩張卡、進入生物看到 `example` 單元卡、社會三分頁可切換且空清單顯示「尚無單元」、`#/unit/nope` 顯示找不到、進度對話框可開關。手機尺寸（375px）無橫向捲動。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: app shell, home and subject views"
```

---

### Task 5: 拖曳輔助與六種活動元件

**Files:**
- Create: `js/dnd.js`, `js/activities/match.js`, `js/activities/sort.js`, `js/activities/sequence.js`, `js/activities/fill.js`, `js/activities/label.js`, `js/activities/flashcard.js`

**Interfaces:**
- Produces `window.APP_DND`：
  - `makeDraggable(el, payload)`：Pointer Events 拖曳（`setPointerCapture`、移動時以 `transform` 跟隨、放開時 `document.elementFromPoint` 找最近 `.drop-zone`），同時支援點選：`pointerup` 未移動超過 8px 視為點選，切換 `.selected`（同一容器一次只能選一個）。
  - `makeDropZone(el, onDrop)`：`onDrop(payload, zoneEl)`；點選模式下點擊區域時若有 `.selected` 項目則呼叫 `onDrop`。
  - `scope(containerEl)` → `{ makeDraggable, makeDropZone, destroy }`，把選取狀態限制在該容器。
- Produces `window.APP_ACTIVITIES[type] = mount(container, data, { onComplete })`，回 `{ destroy }`。`onComplete()` 在活動全部答對時呼叫一次。每種活動行為：
  - `match`：左欄 pairs.left 固定順序，右欄 `shuffle(right)`；把右項拖到左項放置區，對了鎖定並標 `.correct`，錯了閃 `.wrong` 彈回；全部配對完 `onComplete`。
  - `sort`：上方籃子（每個 bucket 一個放置區），下方打亂的 items；放錯彈回並顯示「再想想」。
  - `sequence`：打亂的卡片直列，拖曳交換位置；下方「檢查」按鈕，正確則全部 `.correct` 並 `onComplete`，否則標出位置錯的卡片。
  - `fill`：以 `[[...]]` 切句子，每個空格是放置區，選項 = 答案 ∪ distractors 打亂；填滿自動檢查。
  - `label`：`data.svg` 插入容器（`innerHTML`），外層 `position:relative`，每個 label 依 `x%, y%` 放一個圓形放置區；下方標籤列打亂。
  - `flashcard`：一次一張，點擊翻面；「記得 / 不記得」按鈕；不記得的加回隊尾；隊列清空時 `onComplete`。
- 所有活動的提示文字（「拖到正確位置，或先點選再點目標」）統一由 `dnd.js` 提供 `APP_DND.hintText`。

- [ ] **Step 1: 實作 `js/dnd.js`**

- [ ] **Step 2: 實作六個活動檔**

每檔 `(function(){ window.APP_ACTIVITIES = window.APP_ACTIVITIES || {}; window.APP_ACTIVITIES.match = function mount(container, data, opts) {...}; })();`。打亂一律用 `APP_QUIZ.shuffle`。

- [ ] **Step 3: 建立 `dev/activities.html` 試驗頁**

獨立 HTML 載入 dnd、quiz-logic、六個活動，把 `content/_example.js` 的六個活動各 mount 一次，`onComplete` 時在該區塊顯示「完成」。

- [ ] **Step 4: 瀏覽器驗證**

桌面尺寸：六種活動各用拖曳完成一次。手機尺寸（375px，觸控模擬）：六種活動各用點選模式完成一次；放錯會彈回；無橫向捲動。

- [ ] **Step 5: Commit**

```bash
git add js/dnd.js js/activities dev/
git commit -m "feat: drag/tap helper and six activity components"
```

---

### Task 6: 單元頁四個分頁

**Files:**
- Create: `js/views/unit.js`
- Modify: `js/app.js`（unit route 改為呼叫 `APP_VIEWS.unit`）

**Interfaces:**
- Consumes: `APP_ACTIVITIES`、`APP_QUIZ`、`store` 全部方法、`ctx.h`。
- Produces `APP_VIEWS.unit(root, ctx, unit, tab)`。
- 分頁列固定四個：`concepts 重點整理 / activities 互動活動 / quiz 測驗 / wrong 錯題本`，切換改 hash。每個分頁標題旁顯示狀態圖示。
- `concepts`：概念卡依序，每張 `title`、`body`、`keywords` 為 badge；底部「我讀完了」按鈕 → `markConceptsDone`，已完成時顯示 ✓ 並可再讀。每張卡右上角顯示序號「1/6」，鼓勵一次一張。
- `activities`：每個活動一個可展開區塊，標題 + 狀態 ✓；展開時 `mount`，`onComplete` → `markActivityDone` 並顯示「完成！」。
- `quiz`：開始前顯示題數與最高分；「開始測驗」後一次一題（題目順序 `shuffle`，選項順序固定）；選答後鎖定，顯示 ✓/✗ 與 `explanation`，「下一題」；結束畫面：分數、用時（`Date.now()` 差）、答錯題列表（題幹 + 正解）、「再測一次」；結束時 `recordQuiz`。
- `wrong`：`groupByConcept(unit.quiz, store.get(id).wrongIds)`；每組標題為概念名 + 題數；每題可「重練」：展開選項，答對 → `resolveWrong` 並移出，答錯 → 顯示解析留在清單。空清單顯示「目前沒有錯題」。

- [ ] **Step 1: 實作 `js/views/unit.js` 並接上 `app.js`**

- [ ] **Step 2: 瀏覽器驗證**

以 `example` 單元跑完整流程：讀完重點 → 六個活動完成 → 測驗故意錯兩題 → 錯題本按概念分組顯示兩題 → 重練一題答對後移出 → 回科目頁卡片狀態正確更新 → 重新整理頁面進度仍在 → 匯出檔、清除、匯入還原。手機尺寸再走一次。

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: unit view with concepts, activities, quiz and wrong-answer book"
```

---

### Task 7: 內容：康軒生物 第1章 生命的世界

**Files:**
- Create: `content/bio/ch1.js`
- Modify: `content/manifest.js`（加入路徑；移除 `_example.js`，改放到 `dev/` 供試驗頁使用）

**Interfaces:**
- Consumes: Task 1 的單元格式與活動 data 結構。

- [ ] **Step 1: 撰寫內容**

`id: "bio-ch1"`, `order: 1`, `title: "第1章 生命的世界"`。概念卡 6 張，每張先以生活例子開頭：生命現象（成長、代謝、感應、生殖）、細胞是生命的基本單位、顯微鏡的使用與倍率、動物細胞與植物細胞的異同、細胞構造的功能（細胞膜、細胞核、細胞質、細胞壁、葉綠體、液胞、粒線體）、生物體的組成層次（細胞→組織→器官→器官系統→個體）。
活動 4 個：`sort`「生物 vs 非生物」、`label` 植物細胞構造圖（內嵌簡化 SVG，標 5 個構造）、`match` 構造與功能配對、`sequence` 組成層次排序。
測驗 10 題，每題 `concept` 對應上述卡片標題，解析含「其他選項為什麼錯」。避開特定倍率數字與版本專有名詞。

- [ ] **Step 2: 驗證與瀏覽**

Run: `npm run validate` → 全部合法。瀏覽器開 `#/unit/bio-ch1` 走一遍四個分頁，SVG 在手機尺寸可讀。

- [ ] **Step 3: Commit**

```bash
git add content/ dev/
git commit -m "content: 康軒生物 第1章 生命的世界"
```

---

### Task 8: 內容：南一社會 地理、歷史、公民 第1課

**Files:**
- Create: `content/soc/geo/l1.js`, `content/soc/hist/l1.js`, `content/soc/civ/l1.js`
- Modify: `content/manifest.js`

- [ ] **Step 1: 地理 `soc-geo-l1`「第1課 台灣的位置與範圍」**

概念卡 5 張：經緯度怎麼讀、台灣的絕對位置（北半球、東半球、亞熱帶，不寫精確度數）、相對位置（歐亞大陸東緣、太平洋西側、東亞島弧）、領土範圍（本島、澎湖、金門、馬祖、東沙、南沙太平島）、時區與日期（台灣比格林威治早 8 小時）。活動：`label` 簡化台灣與周邊 SVG 標 5 個位置、`fill` 相對位置敘述、`match` 名詞與定義。測驗 10 題。

- [ ] **Step 2: 歷史 `soc-hist-l1`「第1課 史前台灣與原住民」**

概念卡 5 張：什麼是史前（沒有文字記錄）、考古學家怎麼知道（遺址、器物）、舊石器時代到新石器時代到金屬器時代的生活變化、代表遺址的故事（長濱、大坌坑、卑南、十三行，只講特色不講年代數字）、原住民族與南島語族。活動：`sequence` 三個時代排序、`sort` 器物歸時代、`flashcard` 遺址特色。測驗 10 題。

- [ ] **Step 3: 公民 `soc-civ-l1`「第1課 自我與家庭」**

概念卡 5 張：自我概念從哪裡來、青春期的身心變化、如何面對情緒、家庭的功能、家庭的型態與變遷。活動：`sort` 家庭功能分類、`match` 情緒與處理方式、`fill` 青春期敘述。測驗 10 題，題幹用生活情境。

- [ ] **Step 4: 驗證與瀏覽**

Run: `npm run validate` → `✓ 內容檔 4 個，全部合法`。首頁顯示生物 0/1、社會 0/3；社會三分頁各一個單元。

- [ ] **Step 5: Commit**

```bash
git add content/
git commit -m "content: 南一社會 地理/歷史/公民 第1課"
```

---

### Task 9: 全站驗證與 README

**Files:**
- Create: `README.md`

- [ ] **Step 1: 執行全部測試與驗證**

Run: `npm test && npm run validate`
Expected: 全部 PASS、內容全部合法

- [ ] **Step 2: 瀏覽器完整流程**

file:// 開啟：桌面與手機尺寸各走一次「首頁 → 生物 ch1 四分頁 → 社會三分頁各一單元 → 錯題本重練 → 進度匯出/清除/匯入」。深色模式切換一次確認可讀。記錄任何問題並修正。

- [ ] **Step 3: 寫 `README.md`**

內容：這是什麼、怎麼開（雙擊 index.html / GitHub Pages 步驟）、怎麼新增單元（指向 `docs/content-format.md`）、怎麼跑測試與驗證、內容校對提醒。

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: README and final verification"
```
