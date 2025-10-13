"""变量提取缓存模型"""
from sqlalchemy import Column, String, DateTime, JSON, Index
from sqlalchemy.sql import func, text
import uuid

from models.database import Base


class VariableCache(Base):
    """变量提取缓存模型"""
    
    __tablename__ = "variable_cache"
    
    # 主键
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # 缓存键
    text_hash = Column(String(64), unique=True, nullable=False, index=True)
    
    # 缓存数据
    variables = Column(JSON, nullable=False)  # 提取的变量列表
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), server_default=text("NOW() + INTERVAL '7 days'"))
    
    # 索引
    __table_args__ = (
        Index('idx_text_hash', 'text_hash'),
        Index('idx_expires_at', 'expires_at'),
    )
    
    def __repr__(self):
        return f"<VariableCache(text_hash={self.text_hash[:8]}..., created_at={self.created_at})>"
    
    @property
    def is_expired(self) -> bool:
        """检查缓存是否过期"""
        from datetime import datetime, timezone
        return self.expires_at < datetime.now(timezone.utc)
