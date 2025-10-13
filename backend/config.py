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
    
    # LLM API配置
    OPENAI_API_KEY: str = ""
    OPENAI_API_BASE: str = ""
    GEMINI_API_KEY: str = ""
    LLM_PROVIDER: str = "gemini"  # openai 或 gemini
    LLM_MODEL: str = "gemini-2.0-flash-exp"  # 或 gpt-4o
    
    # JWT 认证
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 168  # 7天
    
    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"
    
    # 文件上传限制
    MAX_UPLOAD_SIZE_MB: int = 10
    ALLOWED_EXTENSIONS: str = ".docx"
    
    # 变量提取提示词
    EXTRACTION_PROMPT: str = """你是一个专业的合同分析助手。请从以下合同文本中识别并提取所有需要填写的变量字段。

**任务要求：**
1. 识别合同中所有的占位符或需要填写的字段
2. 为每个变量提供清晰的名称和描述
3. 判断变量的数据类型（文本、日期、数字等）

**输出格式（JSON）：**
```json
{{
  "variables": [
    {{
      "name": "变量名称",
      "type": "text|date|number|email",
      "description": "变量的详细描述",
      "required": true
    }}
  ]
}}
```

**合同文本：**
{contract_text}

请仔细分析合同文本，提取所有变量。"""
    
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
