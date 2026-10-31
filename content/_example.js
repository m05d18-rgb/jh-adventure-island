// 本單元內容為原創撰寫，請對照課本校對後使用
// ─────────────────────────────────────────────
// 這是「示範單元」，用來說明內容檔怎麼寫。新增單元時：
//   1. 複製這個檔案到 content/<科目>/<線>/<單元>.js
//   2. 改掉所有內容
//   3. 在 content/manifest.js 加一行路徑
//   4. 執行 npm run validate 確認沒有錯誤
// 完整欄位說明見 docs/content-format.md
window.APP_CONTENT.register({
  id: "example",              // 全站唯一，建議格式：bio-ch1、soc-geo-l1
  subject: "bio",             // "bio" 生物 或 "soc" 社會
  track: null,                // 生物填 null；社會填 "geo" 地理 / "hist" 歷史 / "civ" 公民
  order: 99,                  // 在該科（或該線）清單中的順序，數字小的在前
  title: "示範單元：認識這個網站",
  publisher: "示範",
  summary: "用一句話說明這個單元在學什麼。",

  // 概念卡：先給生活例子或畫面，再引出名詞。每張 2–4 句。
  concepts: [
    {
      title: "什麼是互動學習",
      body: "你有沒有玩過把拼圖放到正確位置的遊戲？這個網站就是用同樣的方式學課本內容：先看重點，再動手操作，最後做題目檢查自己懂了沒。",
      keywords: ["重點整理", "互動活動", "測驗"],
    },
    {
      title: "錯題本怎麼用",
      body: "測驗答錯的題目會自動收進錯題本，並且按照「觀念」分組。看到哪一組題目最多，就知道哪個觀念要回去再讀一次。",
      keywords: ["錯題本", "觀念"],
    },
  ],

  // 互動活動：從六種型態挑選。每種型態的 data 結構不同（見下方範例）。
  activities: [
    {
      id: "a1", type: "match", title: "配對：名詞與說明",
      data: {
        pairs: [
          { left: "重點整理", right: "先讀的概念卡" },
          { left: "互動活動", right: "動手操作的練習" },
          { left: "測驗", right: "檢查自己懂了沒" },
          { left: "錯題本", right: "收集答錯的題目" },
        ],
      },
    },
    {
      id: "a2", type: "sort", title: "分類：哪些是學習步驟",
      data: {
        buckets: ["學習步驟", "不是學習步驟"],
        items: [
          { text: "看重點", bucket: 0 },
          { text: "做活動", bucket: 0 },
          { text: "做測驗", bucket: 0 },
          { text: "吃午餐", bucket: 1 },
          { text: "看電視", bucket: 1 },
        ],
      },
    },
    {
      id: "a3", type: "sequence", title: "排序：學習的順序",
      data: {
        prompt: "把學習步驟由先到後排好",
        items: ["看重點整理", "做互動活動", "做測驗", "回頭看錯題本"],
      },
    },
    {
      id: "a4", type: "fill", title: "填空：錯題本的功能",
      data: {
        sentence: "測驗答錯的題目會進入[[錯題本]]，並依照[[觀念]]分組。",
        distractors: ["首頁", "分數"],
      },
    },
    {
      id: "a5", type: "label", title: "標示：網站的四個分頁",
      data: {
        svg: '<svg viewBox="0 0 400 120" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="380" height="100" rx="12" fill="none" stroke="currentColor" stroke-width="2"/><rect x="25" y="25" width="80" height="70" rx="8" fill="none" stroke="currentColor"/><rect x="115" y="25" width="80" height="70" rx="8" fill="none" stroke="currentColor"/><rect x="205" y="25" width="80" height="70" rx="8" fill="none" stroke="currentColor"/><rect x="295" y="25" width="80" height="70" rx="8" fill="none" stroke="currentColor"/></svg>',
        labels: [
          { text: "重點整理", x: 16, y: 50 },
          { text: "互動活動", x: 39, y: 50 },
          { text: "測驗", x: 61, y: 50 },
          { text: "錯題本", x: 84, y: 50 },
        ],
      },
    },
    {
      id: "a6", type: "flashcard", title: "翻牌：記住四個分頁",
      data: {
        cards: [
          { front: "先讀的是哪個分頁？", back: "重點整理" },
          { front: "動手操作的是哪個分頁？", back: "互動活動" },
          { front: "答錯的題目會跑到哪裡？", back: "錯題本" },
        ],
      },
    },
  ],

  // 測驗：單選題。answer 是正確選項的索引（從 0 開始）。
  // concept 必須對應上面某張概念卡的 title，錯題本靠它分組。
  // explanation 要寫「為什麼對」以及「其他選項為什麼錯」。
  quiz: [
    {
      id: "q1",
      concept: "什麼是互動學習",
      question: "這個網站每個單元的學習順序是什麼？",
      options: ["先測驗，再看重點", "先看重點，再做活動，最後測驗", "只做測驗"],
      answer: 1,
      explanation: "先看重點建立觀念，再用活動加深理解，最後用測驗確認。先測驗會因為還沒讀而亂猜；只做測驗沒辦法知道錯在哪個觀念。",
    },
    {
      id: "q2",
      concept: "錯題本怎麼用",
      question: "錯題本裡的題目是怎麼分組的？",
      options: ["依照題號", "依照觀念", "依照答錯次數"],
      answer: 1,
      explanation: "依觀念分組才能看出哪個觀念弱。題號只是順序，沒有意義；答錯次數網站沒有記錄。",
    },
    {
      id: "q3",
      concept: "錯題本怎麼用",
      question: "錯題本裡的題目重練答對之後會怎樣？",
      options: ["留在錯題本", "從錯題本移出", "整個單元重來"],
      answer: 1,
      explanation: "答對代表這題已經弄懂，所以移出。留著會讓清單越來越長；也不需要整個單元重來。",
    },
  ],
});
