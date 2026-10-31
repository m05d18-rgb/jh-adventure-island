# 國一自學站

給國中一年級學生在家自學用的互動網站，科目是**生物（康軒版）**與**社會（南一版，分地理、歷史、公民）**。
每個單元依「重點整理 → 互動活動 → 測驗 → 錯題本」的順序學習，進度存在瀏覽器裡。

純靜態網站：只有 HTML、CSS、JavaScript，不需要安裝任何東西、不需要伺服器。

## 怎麼打開

**方法一：直接開檔案（電腦）**
把整個資料夾下載到電腦，雙擊 `index.html` 就能用，不需要網路。

**方法二：放上 GitHub Pages（手機、平板也能用）**
1. 把整個資料夾推到 GitHub 的一個 repository。
2. 到 repository 的 Settings → Pages，Source 選 `Deploy from a branch`，Branch 選 `main`、資料夾選 `/ (root)`，存檔。
3. 幾分鐘後網址會是 `https://<你的帳號>.github.io/<repository 名稱>/`，用手機打開就能學。

## 內容校對提醒

所有單元的講解與題目都是依 108 課綱原創撰寫，**不是**課本原文。
上線前請對照手邊的課本把每個單元看過一遍；發現需要修正的地方，直接改 `content/` 底下的對應檔案即可。
每個內容檔的第一行都有提醒註解。

## 怎麼新增單元

1. 複製 `content/_example.js`，放到 `content/bio/` 或 `content/soc/<geo|hist|civ>/`，改檔名與內容。
2. 在 `content/manifest.js` 加一行新檔案的路徑。
3. 執行 `npm run validate`，看到「全部合法」才算完成。

欄位說明與六種互動活動的資料格式見 [docs/content-format.md](docs/content-format.md)。

## 開發與測試

需要 Node.js 18 以上（只用於測試與驗證，網站本身不需要）。

```bash
npm test            # 邏輯單元測試（進度儲存、計分、路由、驗證腳本）
npm run validate    # 檢查所有內容檔
node dev/serve.js   # 在 http://localhost:8787 預覽（可省略，直接開 index.html 也行）
```

`dev/activities.html` 是六種互動活動的試驗頁，載入 `content/_example.js` 的活動各一個。

## 專案結構

```
index.html              入口
css/styles.css          樣式（含深色模式）
js/                     共用模組、六種活動元件、畫面
content/                各單元內容檔與 manifest.js
tools/validate-content.js  內容驗證腳本
tests/                  node:test 單元測試
docs/                   設計文件、實作計畫、內容格式說明
```

## 進度

學習進度存在瀏覽器的 localStorage，換裝置或換瀏覽器不會自動同步。
右上角「進度」可以匯出成 JSON 檔、在另一台裝置匯入，或清除全部進度。
