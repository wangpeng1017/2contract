"""FastAPI 主应用"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import logging

from config import settings
from routers import documents, variables, generate, templates, auth
from middleware.logging_middleware import LoggingMiddleware
from middleware.error_handler import setup_exception_handlers

# 配置日志
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    logger.info(f"启动 {settings.APP_NAME}")
    logger.info(f"环境: {settings.APP_ENV}")
    logger.info(f"调试模式: {settings.DEBUG}")
    
    # 启动时的初始化操作
    # TODO: 初始化数据库连接池
    # TODO: 初始化 Redis 连接
    # TODO: 检查 MinIO 连接
    
    yield
    
    # 关闭时的清理操作
    logger.info("关闭应用")


# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    description="智能合同模板处理系统 API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加自定义中间件
app.add_middleware(LoggingMiddleware)

# 配置异常处理
setup_exception_handlers(app)

# 注册路由
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(variables.router)
app.include_router(generate.router)
app.include_router(templates.router)


@app.get("/")
async def root():
    """根路径"""
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "environment": settings.APP_ENV
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    # 简化版健康检查，不检查外部服务
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.APP_ENV,
        "debug": settings.DEBUG
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )
