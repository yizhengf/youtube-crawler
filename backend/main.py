import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import Base, engine
from routers import analysis, channels, crawl, jobs, notion_sync, settings, videos

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="AI 影片工廠 MVP",
    description="YouTube 頻道研究、影片資料庫、任務中心與設定管理",
    version="0.2.0",
)

# CORS — allow all origins for local dev + Vercel deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create all tables on startup
Base.metadata.create_all(bind=engine)

generated_dir = Path(__file__).resolve().parent / "generated"
generated_dir.mkdir(parents=True, exist_ok=True)
app.mount("/generated", StaticFiles(directory=generated_dir), name="generated")

# Register routers
app.include_router(settings.router)
app.include_router(channels.router)
app.include_router(videos.router)
app.include_router(jobs.router)
app.include_router(crawl.router)
app.include_router(notion_sync.router)
app.include_router(analysis.router)


@app.get("/")
def root():
    return {"message": "AI 影片工廠 MVP API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
