from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth, accounts, tasks

app = FastAPI(
    title="蚁小二 API",
    description="社交媒体内容管理和发布系统",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(tasks.router)


@app.get("/")
async def root():
    return {"message": "蚁小二 API", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
