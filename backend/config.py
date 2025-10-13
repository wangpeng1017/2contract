"""应用配置"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """应用配置类"""
    
    # 应用基本信息
    APP_NAME: str = "智能合同模板系统"
    APP_ENV: str = "development"
    DEBUG: bool = True
    
    # 数据库配置
    DATABASE_URL: str
    
    # MinIO 对象存储
    MINIO_ENDPOINT: str
    MINIO_ACCESS_KEY: str
    MINIO_SECRET_KEY: str
    MINIO_BUCKET: str = "contract-storage"
    MINIO_SECURE: bool = False
    
    # Redis 缓存
    REDIS_URL: str
    
    # Gemini API
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.0-flash-exp"
    
    # JWT 认证
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 168  # 7天
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"
    
    # 文件上传限制
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: str = ".docx"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """获取 CORS 来源列表"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    @property
    def allowed_extensions_list(self) -> List[str]:
        """获取允许的文件扩展名列表"""
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]
    
    @property
    def max_upload_size_bytes(self) -> int:
        """获取最大上传大小（字节）"""
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# 全局配置实例
settings = Settings()
