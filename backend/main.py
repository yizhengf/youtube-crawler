import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers import channels, videos, crawl, notion_sync, settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(
    title="YouTube Channel Crawler",
    description="Crawl YouTube channel videos and sync to Notion",
    version="1.0.0",
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

# Register routers
app.include_router(settings.router)
app.include_router(channels.router)
app.include_router(videos.router)
app.include_router(crawl.router)
app.include_router(notion_sync.router)


@app.get("/")
def root():
    return {"message": "YouTube Channel Crawler API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
