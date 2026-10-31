# 內容檔格式說明

每個單元是一個 `.js` 檔，放在 `content/<科目>/<線>/`，例如：

- 生物：`content/bio/ch1.js`
- 社會：`content/soc/geo/l1.js`（地理）、`content/soc/hist/l1.js`（歷史）、`content/soc/civ/l1.js`（公民）

## 新增單元三步驟

1. 複製 `content/_example.js`，改成新的檔名與內容。
2. 在 `content/manifest.js` 加一行該檔案的路徑。
3. 執行 `npm run validate`，看到「全部合法」才算完成。

每個檔案第一行保留這個註解：

```
// 本單元內容為原創撰寫，請對照課本校對後使用
```

## 單元欄位

| 欄位 | 型態 | 說明 |
|------|------|------|
| `id` | 字串 | 全站唯一，建議 `bio-ch1`、`soc-geo-l1` |
| `subject` | `"bio"` 或 `"soc"` | 生物或社會 |
| `track` | `null` 或 `"geo"`/`"hist"`/`"civ"` | 生物填 `null`；社會填地理/歷史/公民 |
| `order` | 數字 | 在清單中的順序，小的在前 |
| `title` | 字串 | 單元名稱，例如「第1章 生命的世界」 |
| `publisher` | 字串 | 「康軒」或「南一」 |
| `summary` | 字串 | 一句話說明這單元在學什麼 |
| `concepts` | 陣列 | 概念卡，見下 |
| `activities` | 陣列 | 互動活動，見下 |
| `quiz` | 陣列 | 測驗題，見下 |

## 概念卡 `concepts[]`

```js
{ title: "概念名稱", body: "兩到四句話。先給生活例子或畫面，再引出名詞。", keywords: ["關鍵詞1", "關鍵詞2"] }
```

`title` 在同一單元內不可重複，因為測驗題的 `concept` 要對應它。

## 互動活動 `activities[]`

每個活動：`{ id, type, title, data }`。`id` 在同一單元內唯一。`type` 與 `data` 的對應如下。

### `match` 配對（名詞 ↔ 說明）
```js
data: { pairs: [ { left: "細胞核", right: "控制細胞活動" }, ... ] }   // 至少 3 組
```

### `sort` 分類（把項目放進正確的籃子）
```js
data: {
  buckets: ["生物", "非生物"],                 // 至少 2 個
  items: [ { text: "狗", bucket: 0 }, { text: "石頭", bucket: 1 }, ... ]  // bucket 是 buckets 的索引
}
```

### `sequence` 排序（把打亂的卡片排成正確順序）
```js
data: { prompt: "由小到大排列", items: ["細胞", "組織", "器官"] }   // items 寫正確順序，至少 3 個
```

### `fill` 填空（句子挖空，從選項拖入）
```js
data: { sentence: "細胞的控制中心是[[細胞核]]。", distractors: ["細胞膜", "液胞"] }
```
用 `[[答案]]` 標記挖空處，可以有多個。`distractors` 是干擾選項，可為空陣列。

### `label` 圖片標示（把名稱拖到圖上的正確位置）
```js
data: {
  svg: '<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">...</svg>',
  labels: [ { text: "細胞核", x: 50, y: 48 }, ... ]   // x、y 是圖片寬高的百分比（0–100），至少 2 個
}
```
SVG 請用 `stroke="currentColor"` 讓深色模式也看得到。

### `flashcard` 翻牌（正面問題、背面答案）
```js
data: { cards: [ { front: "控制細胞活動的構造？", back: "細胞核" }, ... ] }   // 至少 3 張
```

## 測驗題 `quiz[]`

```js
{
  id: "q1",                       // 單元內唯一
  concept: "某張概念卡的 title",   // 錯題本依此分組
  question: "題幹",
  options: ["選項A", "選項B", "選項C", "選項D"],   // 至少 2 個
  answer: 2,                      // 正確選項的索引，從 0 開始
  explanation: "為什麼對；其他選項為什麼錯。",
}
```

建議每單元 8 到 12 題，難度對應段考基礎到中等。

## 常見錯誤訊息

| 訊息 | 意思 |
|------|------|
| `第3題 answer 必須是 0–3 的索引` | `answer` 超出選項數量 |
| `第5題 concept「…」對不到任何概念卡標題` | `concept` 打錯字，或概念卡沒有這個 `title` |
| `活動 a2 items 第4個 bucket 超出範圍` | `bucket` 索引大於 `buckets` 數量 |
| `活動 a4 sentence 至少要有一個 [[答案]] 挖空` | 填空句子忘了標 `[[ ]]` |
| `單元 id 重複：bio-ch1` | 兩個檔案用了同一個 `id` |
