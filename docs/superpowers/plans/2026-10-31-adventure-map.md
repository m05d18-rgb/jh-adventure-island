# 冒險島遊戲化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把首頁換成 Three.js 3D 冒險島地圖，加上吉祥物「咕博士」、三星／金旗／經驗值／徽章／連續天數的獎勵系統與歡迎畫面，不改內容檔格式。

**Architecture:** 獎勵全部由進度狀態推算（`js/game-logic.js`，純函式）；`progress.js` 只多存 `player`、`rightEverIds`、`resolvedCount`。地圖由 `js/map/*` 以 Three.js r158 UMD（本地 `js/vendor/three.min.js`）建立，`views/map.js` 負責 HUD、標籤、點擊與無 WebGL 退路。單元頁掛上 2D 咕博士泡泡與通知。

**Tech Stack:** 既有純靜態架構 + Three.js r158（UMD，本地）。測試 `node:test`。

**Spec:** `docs/superpowers/specs/2026-10-31-adventure-map-design.md`（建立在 `2026-10-31-junior-high-learning-site-design.md` 之上）

## Global Constraints

- 仍為傳統 `<script>` 載入、無 fetch、無 module、file:// 可開。
- Three.js 只用 `js/vendor/three.min.js`，不用 examples 模組，不從 CDN 載入。
- 進度格式 `version: 1` 不變，只新增欄位；舊進度檔可匯入。
- `renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2))`；無 WebGL 時退回卡片清單。
- 星星規則：重點 `conceptsDone`；活動 `activitiesDone.length >= activities.length`；測驗 `bestScore / quizTotal >= 0.8`。金旗 = 3 星。
- 經驗值 = Σ 單元（重點 20 ＋ 活動數 × 15 ＋ `rightEverIds.length` × 5 ＋ 曾達 80%？30：0 ＋ `resolvedCount` × 10）。等級 = `floor(sqrt(xp / 60)) + 1`。
- 徽章 id 固定：`first-star, first-flag, perfect, clean-book, streak-3, streak-7, bio-all, soc-all`。
- 語氣：鼓勵人的學長姐，不幼稚。

## Review Focus

1. 無 WebGL 或 `WebGLRenderer` 建立失敗：首頁顯示卡片清單與 HUD，不噴錯。→ Task 5 瀏覽器模擬。
2. 匯入第一版的舊進度檔（無 `player`、無 `rightEverIds`）：等級與徽章正確回填、星星正確。→ Task 2 測試。
3. 重測同一份測驗多次：XP 不增加（除非新答對了以前沒答對的題）。→ Task 1、2 測試。
4. 跨日判定：昨天有紀錄今天再做 → streak+1；同日多次不變；隔兩天 → 重設 1；跨月跨年正確。→ Task 1 測試。
5. 離開地圖頁再回來多次：不累積 renderer、listener、requestAnimationFrame。→ Task 5 瀏覽器檢查 `performance.memory` 不必，檢查 `document.querySelectorAll('canvas').length === 1` 與 rAF 停止。

---

## File Structure

```
js/vendor/three.min.js        已放置（r158 UMD）
js/game-logic.js              星星/XP/等級/徽章/連續天數（UMD）
js/progress.js                修改：player、rightEverIds、resolvedCount 與新方法
js/map/layout.js              島的位置與橋（UMD，純函式）
js/map/scene.js               場景、海、燈、鏡頭、拖曳旋轉與縮放、動畫迴圈
js/map/island.js              建島、旗、樹、屋；3D 咕博士
js/map/labels.js              3D→2D HTML 標籤
js/mascot.js                  2D 咕博士 SVG、泡泡、通知卡、彩帶
js/views/map.js               首頁（取代 home）：HUD、清單面板、點島、退路
js/views/welcome.js           歡迎輸入名字
js/views/unit.js              修改：三星標題、泡泡、通知、彩帶、streak
js/views/subject.js           修改：卡片顯示三星
js/views/progress-dialog.js   修改：名字、徽章櫃
js/app.js                     修改：home → map、teardown
css/game.css                  HUD、泡泡、通知、彩帶、清單面板、歡迎
index.html                    修改：載入順序
tests/game-logic.test.js, tests/layout.test.js, tests/progress.test.js（新增案例）
```

---

### Task 1: 獎勵純邏輯 `js/game-logic.js`

**Files:** Create `js/game-logic.js`; Test `tests/game-logic.test.js`

**Interfaces（UMD，瀏覽器 `window.APP_GAME`）：**
- `computeStars(unitState, unit)` → `{ concepts: bool, activities: bool, quiz: bool, count: 0..3, flag: bool }`
- `unitXp(unitState)` → number（依 Global Constraints 公式；`quizTotal` 為 null 時測驗項為 0）
- `totalXp(statesById)` → number
- `levelFor(xp)` → `{ level, xp, levelStart, nextAt }`（`levelStart = 60*(level-1)^2`，`nextAt = 60*level^2`）
- `BADGES` → `[{ id, name, desc }]`（8 個，順序如 Global Constraints）
- `computeBadges(statesById, units, streak)` → `string[]`（id 陣列，依 BADGES 順序）
  - `perfect`：任一單元 `bestScore === quizTotal && quizTotal > 0`
  - `clean-book`：任一單元 `resolvedCount > 0 && wrongIds.length === 0`
  - `bio-all` / `soc-all`：該科所有單元 `flag`（該科至少 1 單元）
- `touchStreak(streak, today)` → 新 `{ count, last }`；`today` 為 `'YYYY-MM-DD'`；`streak` 可為 null
- `dayDiff(a, b)` → 整數天數（以 UTC 日期計算避免時區誤差）
- `todayStr(date = new Date())` → 本地 `'YYYY-MM-DD'`

- [ ] **Step 1: 寫失敗的測試** `tests/game-logic.test.js`

```js
const { computeStars, unitXp, totalXp, levelFor, BADGES, computeBadges, touchStreak, dayDiff } = require('../js/game-logic.js');
const unit = { id: 'u', subject: 'bio', activities: [{ id: 'a1' }, { id: 'a2' }], quiz: [{}, {}, {}, {}, {}] };
const st = (o) => Object.assign({ conceptsDone: false, activitiesDone: [], bestScore: null, quizTotal: null, attempts: 0, wrongIds: [], rightEverIds: [], resolvedCount: 0 }, o);

test('三星與金旗', () => {
  assert.deepEqual(computeStars(st({}), unit), { concepts: false, activities: false, quiz: false, count: 0, flag: false });
  const s = computeStars(st({ conceptsDone: true, activitiesDone: ['a1', 'a2'], bestScore: 4, quizTotal: 5 }), unit);
  assert.equal(s.count, 3); assert.equal(s.flag, true);
  assert.equal(computeStars(st({ bestScore: 3, quizTotal: 5 }), unit).quiz, false);
});
test('unitXp 公式', () => {
  assert.equal(unitXp(st({})), 0);
  assert.equal(unitXp(st({ conceptsDone: true, activitiesDone: ['a1'], rightEverIds: ['q1', 'q2'], bestScore: 4, quizTotal: 5, resolvedCount: 1 })), 20 + 15 + 10 + 30 + 10);
});
test('levelFor', () => {
  assert.deepEqual(levelFor(0), { level: 1, xp: 0, levelStart: 0, nextAt: 60 });
  assert.equal(levelFor(60).level, 2); assert.equal(levelFor(239).level, 2); assert.equal(levelFor(240).level, 3);
});
test('徽章：first-star / first-flag / perfect / clean-book', () => {
  const units = [unit];
  assert.deepEqual(computeBadges({ u: st({}) }, units, null), []);
  assert.deepEqual(computeBadges({ u: st({ conceptsDone: true }) }, units, null), ['first-star']);
  const full = st({ conceptsDone: true, activitiesDone: ['a1', 'a2'], bestScore: 5, quizTotal: 5, resolvedCount: 1, wrongIds: [] });
  assert.deepEqual(computeBadges({ u: full }, units, null), ['first-star', 'first-flag', 'perfect', 'clean-book', 'bio-all']);
});
test('徽章：streak 與 soc-all', () => {
  const soc = [{ id: 's1', subject: 'soc', activities: [], quiz: [{}] }];
  const done = st({ conceptsDone: true, bestScore: 1, quizTotal: 1 });
  assert.ok(computeBadges({ s1: done }, soc, { count: 3 }).includes('streak-3'));
  assert.ok(!computeBadges({ s1: done }, soc, { count: 3 }).includes('streak-7'));
  assert.ok(computeBadges({ s1: done }, soc, { count: 7 }).includes('streak-7'));
  assert.ok(computeBadges({ s1: done }, soc, null).includes('soc-all'));
});
test('dayDiff 與 touchStreak', () => {
  assert.equal(dayDiff('2026-10-31', '2026-11-01'), 1);
  assert.equal(dayDiff('2026-12-31', '2027-01-01'), 1);
  assert.deepEqual(touchStreak(null, '2026-10-31'), { count: 1, last: '2026-10-31' });
  assert.deepEqual(touchStreak({ count: 2, last: '2026-10-31' }, '2026-10-31'), { count: 2, last: '2026-10-31' });
  assert.deepEqual(touchStreak({ count: 2, last: '2026-10-31' }, '2026-11-01'), { count: 3, last: '2026-11-01' });
  assert.deepEqual(touchStreak({ count: 5, last: '2026-10-29' }, '2026-10-31'), { count: 1, last: '2026-10-31' });
});
```

- [ ] **Step 2: 跑測試確認失敗**　Run: `npm test`　Expected: 找不到模組
- [ ] **Step 3: 實作 `js/game-logic.js`**（UMD 包裝同 `quiz-logic.js`）
- [ ] **Step 4: 跑測試確認通過**　Run: `npm test`　Expected: 全部 PASS
- [ ] **Step 5: Commit**　`git commit -m "feat: game logic (stars, xp, badges, streak)"`

---

### Task 2: `progress.js` 新欄位與方法

**Files:** Modify `js/progress.js`; Test `tests/progress.test.js`（新增案例）

**Interfaces（新增）：**
- 單元預設多兩欄：`rightEverIds: []`、`resolvedCount: 0`；`recordQuiz` 把 `rightIds` 併入 `rightEverIds`（去重）；`resolveWrong` 把該題加入 `rightEverIds` 並 `resolvedCount += 1`（僅當該題原本在 `wrongIds` 中）。
- `player` 預設：`{ name: '', badgesSeen: [], streak: null, lastUnit: null }`；`getPlayer()` 回副本。
- `setName(name)`、`setLastUnit(unitId)`、`touchStreak(today)`（用 `APP_GAME.touchStreak`；Node 下 `require('./game-logic.js')`）、`markBadgesSeen(ids)`（去重）。
- `allUnits()` → `{ [id]: unitState }` 副本（供 `computeBadges`／`totalXp`）。
- `parseState` 接受缺 `player` / 新欄位的舊資料並補預設；`exportJSON` 含 `player`。
- `clear()` 連名字一起清（實作者決定：清除就是全新開始）。

- [ ] **Step 1: 寫失敗的測試**（附加到 `tests/progress.test.js`）

```js
test('新欄位預設與 player 預設', () => {
  const s = createProgressStore(mem());
  assert.deepEqual(s.get('u').rightEverIds, []); assert.equal(s.get('u').resolvedCount, 0);
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
  s.resolveWrong('u', 'q1'); s.resolveWrong('u', 'q1');
  assert.equal(s.get('u').resolvedCount, 1); assert.deepEqual(s.get('u').rightEverIds, ['q1']);
});
test('舊格式匯入補齊新欄位', () => {
  const s = createProgressStore(mem());
  const old = JSON.stringify({ version: 1, units: { u: { conceptsDone: true, activitiesDone: [], bestScore: 3, quizTotal: 3, attempts: 1, wrongIds: [] } } });
  assert.equal(s.importJSON(old).ok, true);
  assert.deepEqual(s.get('u').rightEverIds, []); assert.equal(s.getPlayer().name, '');
});
test('player 方法與持久化', () => {
  const st = mem(); const s = createProgressStore(st);
  s.setName('小明'); s.setLastUnit('bio-ch1'); s.touchStreak('2026-10-31'); s.markBadgesSeen(['first-star']); s.markBadgesSeen(['first-star']);
  const p = createProgressStore(st).getPlayer();
  assert.equal(p.name, '小明'); assert.equal(p.lastUnit, 'bio-ch1'); assert.deepEqual(p.streak, { count: 1, last: '2026-10-31' }); assert.deepEqual(p.badgesSeen, ['first-star']);
});
test('allUnits 回副本', () => { const s = createProgressStore(mem()); s.markConceptsDone('u'); const a = s.allUnits(); a.u.conceptsDone = false; assert.equal(s.get('u').conceptsDone, true); });
```

- [ ] **Step 2: 跑測試確認失敗**　Expected: `getPlayer is not a function` 等
- [ ] **Step 3: 實作**（Node 端 `require('./game-logic.js')`，瀏覽器端用 `window.APP_GAME`）
- [ ] **Step 4: 跑測試確認通過**（既有 50 個也要過）
- [ ] **Step 5: Commit**　`git commit -m "feat: progress player fields and first-time tracking"`

---

### Task 3: 地圖版面 `js/map/layout.js`

**Files:** Create `js/map/layout.js`; Test `tests/layout.test.js`

**Interfaces（UMD，瀏覽器 `window.APP_LAYOUT`）：**
- `layoutIslands(units, opts)` → `{ islands: [{ id, x, z, chain, index, unit }], bridges: [{ from, to }], bounds: { minX, maxX, minZ, maxZ } }`
  - `chain` 為 `'bio' | 'geo' | 'hist' | 'civ'`；每鏈依 `order` 排序；蛇形：每排 `opts.perRow`（預設 6）座，`x` 在偶數排遞增、奇數排遞減；排與排間距 `opts.rowGap`（預設 9）；島間距 `opts.gap`（預設 8）。
  - 鏈的基準位置：`bio` 從 `x = -40` 起；`geo/hist/civ` 從 `x = 8` 起，三鏈 `z` 各差 `opts.chainGap`（預設 14）；每鏈的排從 `z = chainBase` 往 +z 延伸。
  - 橋只連同鏈 `index` 相鄰的島。
- `nearestIslandForPlayer(islands, statesById, lastUnit)` → island：若 `lastUnit` 存在且未金旗則它；否則第一座未金旗的島；全金旗則最後一座。

- [ ] **Step 1: 寫失敗的測試**

```js
const units = [
  { id: 'b1', subject: 'bio', track: null, order: 1 }, { id: 'b2', subject: 'bio', track: null, order: 2 },
  { id: 'g1', subject: 'soc', track: 'geo', order: 1 }, { id: 'h1', subject: 'soc', track: 'hist', order: 1 }, { id: 'c1', subject: 'soc', track: 'civ', order: 1 },
];
test('每島一個位置、無重疊', () => { const r = layoutIslands(units); assert.equal(r.islands.length, 5); const keys = new Set(r.islands.map(i => i.x + ',' + i.z)); assert.equal(keys.size, 5); });
test('橋只連同鏈相鄰', () => { const r = layoutIslands(units); assert.deepEqual(r.bridges, [{ from: 'b1', to: 'b2' }]); });
test('蛇形：第 7 座在第二排且 x 反向', () => {
  const many = Array.from({ length: 8 }, (_, i) => ({ id: 'b' + i, subject: 'bio', track: null, order: i + 1 }));
  const r = layoutIslands(many, { perRow: 6, gap: 8, rowGap: 9 });
  const row0 = r.islands.slice(0, 6), row1 = r.islands.slice(6);
  assert.ok(row1.every(i => i.z === row0[0].z + 9));
  assert.equal(row1[0].x, row0[5].x);
});
test('nearestIslandForPlayer', () => {
  const r = layoutIslands(units);
  const flag = { conceptsDone: true, activitiesDone: [], bestScore: 1, quizTotal: 1, wrongIds: [], rightEverIds: [], resolvedCount: 0 };
  const unitsFull = units.map(u => Object.assign({ activities: [], quiz: [{}] }, u));
  const r2 = layoutIslands(unitsFull);
  assert.equal(nearestIslandForPlayer(r2.islands, { b1: flag }, null).id, 'b2');
  assert.equal(nearestIslandForPlayer(r2.islands, {}, 'g1').id, 'g1');
});
```
（`nearestIslandForPlayer` 需 `unit.activities/quiz` 判金旗，用 `APP_GAME.computeStars`。）

- [ ] **Step 2: 跑測試確認失敗**
- [ ] **Step 3: 實作**
- [ ] **Step 4: 跑測試確認通過**
- [ ] **Step 5: Commit**　`git commit -m "feat: island layout"`

---

### Task 4: 吉祥物、泡泡、通知、彩帶 `js/mascot.js` + `css/game.css`

**Files:** Create `js/mascot.js`, `css/game.css`; Modify `index.html`（載入 game.css、mascot.js）

**Interfaces（`window.APP_MASCOT`）：**
- `svg(mood)` → SVG 字串；`mood` ∈ `'happy' | 'cheer' | 'think' | 'oops' | 'sleep'`；圓身貓頭鷹，`currentColor` 描邊、固定填色（棕、米、橘嘴），眼睛與嘴依 mood 變化。
- `mountBubble(container, { mood, text, name })` → `{ say(text, mood), hide(), show(), destroy() }`；右下角固定（`.mascot-dock`），點貓頭鷹切換泡泡顯示；文字可含 `{name}`。
- `notify({ icon, title, desc })`：上方滑出通知卡，3 秒後消失，多張依序堆疊。
- `confetti(durationMs = 2500)`：全畫面 canvas 彩帶，結束後移除。
- `LINES`：文案表 `{ concepts: [...], activityDone: [...], quizWrong: [...], quizPass: [...], quizFail: [...], cleanBook: [...], welcome: [...], mapHint: [...] }`，每項至少 3 句，`pick(key, name)` 隨機取一句並代入名字。

- [ ] **Step 1: 實作 `js/mascot.js` 與 `css/game.css`**（`.mascot-dock`、`.bubble`、`.notify-stack`、`.notify`、`.confetti-canvas`、`.hud`、`.island-list`、`.welcome`、`.stars`）
- [ ] **Step 2: 建 `dev/mascot.html`**：五種表情並排、一個泡泡、按鈕觸發通知與彩帶
- [ ] **Step 3: 瀏覽器驗證**：五種表情可辨識、泡泡可收合、通知堆疊、彩帶會結束並移除 canvas
- [ ] **Step 4: Commit**　`git commit -m "feat: mascot, bubble, notifications, confetti"`

---

### Task 5: 3D 地圖首頁

**Files:** Create `js/map/scene.js`, `js/map/island.js`, `js/map/labels.js`, `js/views/map.js`, `js/views/welcome.js`; Modify `js/app.js`, `index.html`

**Interfaces：**
- `APP_MAP.createScene(container, { isMobile })` → `{ scene, camera, renderer, add(obj), start(), stop(), dispose(), onFrame(fn), orbit: { target, angle, distance, setTarget(x,z,animMs), flyTo(x,z,distance,ms) → Promise }, project(vec3) → {x,y,visible}, raycast(clientX, clientY, objects) → obj|null, setDirty() }`
  - 海：`PlaneGeometry(400,400,80,80)` 頂點 y 由正弦波動；天空用 `scene.background` 漸層色（canvas 貼圖）或純色 + 霧。
  - 鏡頭俯角 35°，距離範圍 25–120；拖曳繞 target 旋轉（Pointer Events，自製）；滾輪與雙指縮放。
  - 動畫迴圈：有互動或動畫時 60fps，否則 30fps；`visibilitychange` 暫停；`dispose()` 釋放幾何、材質、renderer 並取消 rAF。
- `APP_MAP.buildIsland({ x, z, state: 'new'|'progress'|'flag', seed })` → `THREE.Group`（`userData.islandId` 設在群組與島身 mesh）；`setIslandState(group, state)`；`buildBridge(a, b)` → Mesh；`buildOwl()` → Group（含 `bob(t)` 上下浮動）；`buildDecor(seed)` 裝飾小島。
- `APP_MAP.createLabels(container, scene)` → `{ add(id, el, vec3), update(project, zoom), remove(id), destroy() }`；縮放超過閾值時只顯示 `el.dataset.important === '1'` 的標籤。
- `APP_VIEWS.map(root, ctx)`：
  1. 若 `ctx.store.getPlayer().name === ''` → 先 `APP_VIEWS.welcome(ctx, onDone)`。
  2. 嘗試建場景；失敗 → 呼叫 `APP_VIEWS.islandList(root, ctx)`（第一版卡片清單搬到這個函式，含科目卡與三星）並 return。
  3. 用 `APP_LAYOUT.layoutIslands(ctx.content.all())` 建島、橋、裝飾；標籤顯示「編號 標題 ★n/3」，金旗島與目前島 `important`。
  4. HUD（左上）：名字、`Lv.n` 與經驗條、★ 總數/總數、🚩 數/總數、🔥 連續天數。
  5. 咕博士 3D 站在 `nearestIslandForPlayer` 的島上；底部泡泡 `pick('mapHint', name)` 並點名建議的島。
  6. 點島：`flyTo` 600ms 後 `ctx.navigate({ view: 'unit', unitId })`。
  7. 桌面右側（寬 ≥ 900px）固定清單面板；手機底部「島嶼清單」按鈕展開抽屜。清單即 `islandList`。
  8. 回傳 `{ destroy }`；`app.js` 在離開首頁時呼叫（與 `teardownUnit` 同樣機制：`APP_VIEWS.teardownMap`）。
- `APP_VIEWS.welcome(ctx, onDone)`：對話框、咕博士 `cheer`、名字輸入（必填、最多 12 字）、「開始冒險」→ `setName` → `onDone()`。
- `app.js`：`home` 路由改 `views.map`；`render` 開頭呼叫 `teardownMap`；`isMobile = matchMedia('(pointer: coarse)').matches || innerWidth < 768`。
- `index.html`：`three.min.js` 最先；新增 `game-logic.js`、`map/layout.js`、`map/scene.js`、`map/island.js`、`map/labels.js`、`mascot.js`、`views/welcome.js`、`views/map.js`、`css/game.css`。

- [ ] **Step 1: 實作 scene.js、island.js、labels.js，建 `dev/map.html` 試驗頁**（載入三個檔與 layout，用假單元畫 10 座島、2 座金旗、咕博士）
- [ ] **Step 2: 瀏覽器驗證試驗頁**：可拖曳旋轉、縮放、標籤跟著島、點島回報 id、`dispose` 後 `canvas` 消失且 rAF 停止（用 `performance.now` 計數）
- [ ] **Step 3: 實作 views/map.js、views/welcome.js，接上 app.js 與 index.html**
- [ ] **Step 4: 瀏覽器驗證**：首次進站歡迎 → 輸入名字 → 地圖 HUD 正確 → 點島飛近並進入單元 → 返回地圖不重複建 canvas；手機尺寸抽屜可開；用 `javascript_tool` 覆寫 `HTMLCanvasElement.prototype.getContext` 回 null 模擬無 WebGL → 顯示清單退路
- [ ] **Step 5: Commit**　`git commit -m "feat: 3D adventure map home with HUD and welcome"`

---

### Task 6: 單元頁、科目頁、進度對話框整合

**Files:** Modify `js/views/unit.js`, `js/views/subject.js`, `js/views/progress-dialog.js`

- `unit.js`：
  - 標題列加 `.stars`（三顆，點亮依 `computeStars`）；返回連結改指地圖 `#/`（科目頁仍可由清單進入）。
  - 進入單元：`setLastUnit`；每個學習動作（讀完重點、活動完成、測驗結束、重練答對）後呼叫 `touchStreak(todayStr())`，然後 `checkRewards()`：比較動作前後的 `computeStars(...).count` 與 `computeBadges(...)`，新星 → `notify({icon:'★', title:'獲得星星：重點/活動/測驗'})`，新徽章 → `notify` + `markBadgesSeen`；若剛達金旗 → `confetti()` 並在面板頂端顯示「回地圖看金旗 →」。
  - 右下角 `mountBubble`，各分頁與事件依 `LINES` 換話（含名字）。
- `subject.js`：單元卡片的狀態列改為三顆星 + 金旗徽章；科目頁頂部顯示該科星數。
- `progress-dialog.js`：加「名字」輸入（即時 `setName`）、「徽章櫃」（`BADGES` 全列，已得亮、未得灰並顯示條件）、「連續 n 天」。

- [ ] **Step 1: 實作三個檔案的修改**
- [ ] **Step 2: 瀏覽器驗證**：清除進度 → 歡迎輸入名字 → 進生物第 1 章 → 讀完重點（通知 ★ + first-star 徽章通知）→ 活動全做完（通知）→ 測驗 ≥80%（通知 + 彩帶 + 金旗按鈕）→ 回地圖島變金旗、HUD 更新 → 徽章櫃正確
- [ ] **Step 3: Commit**　`git commit -m "feat: rewards, mascot guidance and badge shelf in unit flow"`

---

### Task 7: 全站驗證、README、審查

- [ ] **Step 1:** `npm test && npm run validate` 全過
- [ ] **Step 2:** 手機尺寸 + 深色模式各走一次完整流程；檢查首頁 `canvas` 數量為 1；離開再回首頁 3 次後仍為 1
- [ ] **Step 3:** README 加「遊戲化」段落（星星規則、徽章、Three.js 本地檔說明）
- [ ] **Step 4:** Commit `docs: README for adventure map`，然後整體審查
