# YouTube 爆款影片分析工具

一套用來取代 n8n 工作流程的 YouTube 頻道影片爬取與分析工具。透過網頁介面即可輕鬆管理頻道、爬取影片資料、檢視統計數據，並將資料同步至 Notion 資料庫。

## 專案結構

```
project/
├── backend/             # Python FastAPI 後端
│   ├── main.py          # 應用程式進入點
│   ├── database.py      # SQLite 資料庫設定
│   ├── models.py        # 資料模型
│   ├── schemas.py       # Pydantic schemas
│   ├── requirements.txt # Python 依賴套件
│   ├── routers/         # API 路由
│   │   ├── channels.py  # 頻道管理
│   │   ├── videos.py    # 影片資料
│   │   ├── crawl.py     # 爬取功能
│   │   ├── settings.py  # 設定管理
│   │   └── notion_sync.py # Notion 同步
│   └── services/        # 商業邏輯
│       ├── youtube.py   # YouTube API 服務
│       ├── notion.py    # Notion API 服務
│       └── task_manager.py # 背景任務管理
├── frontend/            # Next.js 前端
│   ├── src/
│   │   ├── app/         # 頁面路由
│   │   ├── components/  # React 元件
│   │   └── lib/         # 工具函式
│   ├── next.config.mjs  # Next.js 設定
│   ├── package.json     # Node.js 依賴套件
│   └── tailwind.config.ts
└── README.md
```

## 本機開發設定

### 一鍵啟動

在專案根目錄直接執行：

```bash
bash start-local.sh
```

停止：

```bash
bash stop-local.sh
```

預設會啟動：

- 後端：`http://127.0.0.1:8000`
- 前端：`http://127.0.0.1:3002/channels`

日誌會寫到 `.run/` 目錄。

### 後端

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

後端預設執行於 `http://localhost:8000`。

### 前端

```bash
cd frontend
npm install
```

建立 `.env.local` 檔案，設定 API 位址：

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

啟動開發伺服器：

```bash
npm run dev
```

前端預設執行於 `http://localhost:3000`。

## 環境變數

### 後端

| 變數名稱 | 說明 |
|---|---|
| `YOUTUBE_API_KEY` | YouTube Data API v3 金鑰 |
| `NOTION_TOKEN` | Notion Integration Token |
| `NOTION_CHANNELS_DB_ID` | Notion 頻道資料庫 ID |
| `NOTION_VIDEOS_DB_ID` | Notion 影片資料庫 ID |

> 以上變數也可透過網頁應用程式的「設定」頁面進行設定，設定值會儲存於 SQLite 資料庫中。

### 前端

| 變數名稱 | 說明 |
|---|---|
| `NEXT_PUBLIC_API_URL` | 後端 API 位址（例如 `http://localhost:8000`） |

## 部署說明

### 前端

前端可部署至 **Vercel**。`next.config.mjs` 已設定 `output: 'standalone'`，適用於容器化部署。

部署時需在 Vercel 環境變數中設定 `NEXT_PUBLIC_API_URL`，指向已部署的後端 URL。

### 後端

後端可部署至任何支援 Python 的主機服務，例如：

- Railway
- Render
- Fly.io

## 功能列表（MVP）

- 新增 YouTube 頻道，自動解析 Channel ID
- 爬取頻道所有影片（支援完整分頁）
- 爬取影片統計數據（觀看次數、按讚數、留言數、標籤、影片長度）
- 一鍵執行完整爬取流程
- 影片排序、搜尋與篩選
- 將資料同步至 Notion 資料庫
- 背景任務進度追蹤

## 未來規劃

- AI 影片內容分析
- 影片翻拍腳本自動生成
