from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .config import settings
from .database import engine, Base
from .redis_client import init_redis
from .scheduler import start_scheduler, stop_scheduler
from .routes import auth, tracking, websocket


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    await init_redis()
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="快递物流轨迹查询系统 API",
    description="使用FastAPI + Redis + MySQL开发的快递物流轨迹查询系统",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(tracking.router, prefix="/api")
app.include_router(websocket.router)


@app.get("/")
async def root():
    return {
        "message": "快递物流轨迹查询系统 API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
