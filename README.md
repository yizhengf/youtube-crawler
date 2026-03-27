# YouTube 爆款影片與 AI 影片工廠 MVP

一套從 n8n workflow 轉成本地 Web App 的 MVP。  
目前已整合：

- YouTube 頻道與影片爬蟲
- Notion 同步
- 任務中心
- 仿寫故事影片腳本生成
- fal.ai / OpenAI / placeholder TTS
- 本地 FFmpeg 成片

透過網頁介面即可管理頻道、影片、設定與內容任務，先完成「研究爆款 -> 建立任務 -> 產出本地影片」這條低成本流程。

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
│   │   ├── channels.py / crawl.py
│   │   ├── videos.py
│   │   ├── jobs.py
│   │   ├── analysis.py
│   │   ├── settings.py
│   │   └── notion_sync.py
│   └── services/        # 商業邏輯
│       ├── youtube.py
│       ├── notion.py
│       ├── job_runner.py
│       ├── story_video_pipeline.py
│       ├── tts_service.py
│       ├── render_service.py
│       └── task_manager.py
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

## 主要頁面

- `/channels`：頻道管理
- `/videos`：影片資料庫
- `/jobs`：任務中心
- `/settings`：設定
- `/analysis`：AI 分析預留頁（目前僅 placeholder）

## 環境變數

### 後端

| 變數名稱 | 說明 |
|---|---|
| `YOUTUBE_API_KEY` | YouTube Data API v3 金鑰 |
| `NOTION_TOKEN` | Notion Integration Token |
| `NOTION_CHANNELS_DB_ID` | Notion 頻道資料庫 ID |
| `NOTION_VIDEOS_DB_ID` | Notion 影片資料庫 ID |
| `OPENAI_API_KEY` | OpenAI API Key（可選，TTS fallback） |
| `FAL_API_KEY` | fal.ai API Key（目前 TTS 優先） |

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

## 功能列表（目前版本）

### 1. 頻道管理

- 新增 YouTube 頻道
- 自動解析 Channel ID / Handle
- 爬取頻道影片
- 補抓影片統計
- 同步頻道資料到 Notion

### 2. 影片資料庫

- 顯示影片列表
- 搜尋、排序、篩選
- 從影片直接建立任務
- 同步影片資料到 Notion

### 3. 任務中心

- 支援兩種任務：
  - `仿寫故事影片`
  - `AI 影片生成（目前為占位任務）`
- 任務列表 / 任務詳情
- 背景執行狀態
- 審核、重跑
- 腳本、分鏡、prompt bundle 顯示

### 4. 低成本本地成片流程

- `仿寫故事影片` 會自動產生：
  - 標題
  - 大綱
  - narration
  - storyboard
  - prompt bundle
- TTS 優先順序：
  - `fal.ai`
  - `OpenAI`
  - `placeholder`
- 本地 FFmpeg 會輸出：
  - 音檔
  - 最終 `mp4`

### 5. 設定管理

- YouTube API
- Notion token / database ids
- OpenAI API Key
- fal.ai API Key
- 其他 AI provider 欄位預留：
  - DeepSeek
  - Sora
  - 海螺
  - Grok

## 未來規劃

- AI 爆款影片分析
- 對標頻道分析
- 真實 AI 影片生成 provider
- YouTube 自動發布
