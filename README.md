# 承熹的小宇宙 — GitHub Pages 版本

這是一個無須安裝、無須編譯的靜態網站。保留原有暖米白、鼠尾草綠的家庭故事書設計，包含成長故事、章節與里程碑篩選、相片／影片相簿、家人的信，以及按香港日期更新的年齡。

此版本供 GitHub Pages 發布使用。網站網址：https://nigohkw.github.io/ 。原有私人網站不受影響。

## 網址

已確認的 GitHub 用戶名稱：`niGohkw`。

如要使用 `https://nigohkw.github.io/`，儲存庫應命名為 `nigohkw.github.io`。

如放到其他儲存庫，例如 `chenghei`，網址會是 `https://nigohkw.github.io/chenghei/`。網站使用相對路徑，可支援兩種情況。

## 首次架設（最簡單方法）

1. 在 GitHub 建立 `nigohkw.github.io` 儲存庫。GitHub Free 使用 Pages 時，來源儲存庫須為 Public。先確認你接受網站公開。
2. 將 ZIP 解壓。上載解壓後的全部檔案及資料夾至儲存庫最頂層，**不要把 ZIP 本身上載，也不要多包一層資料夾**。最頂層應直接有 `index.html`、`styles.css`、`app.js` 及 `content/`。
3. 提交（Commit）至 `main` 分支。
4. 開啟儲存庫的 **Settings → Pages**。
5. **Source** 選 **Deploy from a branch**。
6. 分支選 **main**，資料夾選 **/ (root)**，按 **Save**。
7. 等候 GitHub 完成部署，再從 Pages 設定內的 **Visit site** 開啟網站。部署可能需數分鐘。

本包附 `.nojekyll`，不需要 Node.js、npm、API 金鑰或 GitHub Actions 自訂工作流程。

## 公開與私人內容

一般個人 GitHub Pages 網站公開可讀，即使來源儲存庫是私人，也不代表網站本身保密。請只把你願意公開的相片、影片、生日資料與文字放入此版本。`noindex` 只能要求搜尋器不要收錄，不能防止其他人閱讀或轉發。

此版本沒有登入、後台上載或跨裝置寫入功能，也不會把回憶偷偷存在瀏覽器。新增內容須更新 GitHub 檔案，再由 Pages 發布。日後可另接具有身份驗證的資料與媒體後台，但不是純 GitHub Pages 自帶能力。

## 網站檔案

- `index.html`：頁面結構與插畫。
- `styles.css`：電腦及手機版面。
- `app.js`：讀取內容、排序、篩選、圖片與影片燈箱。
- `content/memories.json`：個人資料及所有故事。
- `media/`：你自行加入的照片及短片。
- `README.html`：可直接在網頁閱讀的管理說明。
- `favicon.svg`：月亮圖示。
- `.nojekyll`：保留純靜態發布方式。

## 新增一段回憶

1. 把相片或影片上載至 `media/`。檔名建議用英文、數字及短橫線，例如 `first-ultrasound.jpg`。
2. 打開 `content/memories.json`，將一個回憶物件加入 `memories` 陣列。
3. 每段回憶的 `id`、每個媒體的 `id` 必須獨一無二。
4. 提交更改；GitHub Pages 完成新部署後，重新整理網站。

以下只是格式範例，**不代表承熹真實發生過的紀錄**。日期、檔名及文字請按實際情況修改。例子中的檔案不包括在此包內：

```json
{
  "id": "memory-001",
  "title": "第一次在螢幕見到你",
  "date": "2025-03-01",
  "chapter": "pregnancy",
  "kind": "memory",
  "note": "在這裏記低當天的心情。",
  "featured": true,
  "createdAt": "2026-10-17T00:00:00+08:00",
  "media": [
    {
      "id": "photo-001",
      "name": "first-ultrasound.jpg",
      "mime": "image/jpeg",
      "url": "media/first-ultrasound.jpg"
    }
  ]
}
```

多段回憶用逗號分隔；最後一段後面不要留逗號。保留外層 `profile` 與 `memories`，不要直接用上方單一物件覆蓋整份 JSON。

### 欄位

| 欄位 | 值／用途 |
| --- | --- |
| `chapter` | `pregnancy` 還未見面；`birth` 初次見面；`growing` 一起長大 |
| `kind` | `memory` 日常；`milestone` 第一次；`letter` 寫給孩子的信 |
| `date` | 真實日期，格式 `YYYY-MM-DD` |
| `featured` | `true` 精選；有圖片的精選回憶可作首頁封面 |
| `note` | 文字；段落換行用 `\n` |
| `media` | 可有多張相片／短片；純文字或信件可用 `[]` |
| `mime` | 例如 `image/jpeg`、`image/png`、`video/mp4` |
| `url` | `media/檔名` 等相對路徑；也可用你有權公開的 HTTPS 媒體網址 |

### 相片與影片

- 建議相片用 JPG、PNG 或 WebP；iPhone HEIC 請先轉成 JPG。
- 建議影片用 MP4（H.264 影像／AAC 聲音），實際播放支援視乎瀏覽器及編碼。
- 此版本沒有原私人版每個檔案 30 MB 的應用程式限制；改為遵從 GitHub 的檔案、網站大小及流量限制。
- 透過 GitHub 網頁上載，單一檔案上限 25 MiB；Git 禁止大於 100 MiB 的一般檔案。GitHub Pages 發布後網站上限 1 GB。因此不適合放大量原畫質長片。
- 若放外部影片，必須使用能直接供 HTML `<video>` 播放的 HTTPS 媒體連結；YouTube 的一般觀看網址並非此類連結。

## 本機預覽

直接雙擊 `index.html` 時，瀏覽器可能阻擋讀取 JSON。請從 GitHub Pages 開啟，或在網站資料夾使用你信任的本機靜態伺服器，例如：

```sh
python3 -m http.server 8000
```

然後開啟 `http://localhost:8000/`。

## 官方說明

- 建立 Pages：https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
- Pages 類型及網址：https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- Pages 限制：https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- GitHub 檔案限制：https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github
