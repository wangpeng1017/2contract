"""模板模型"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from models.database import Base


class Template(Base):
    """合同模板模型"""
    
    __tablename__ = "templates"
    
    # 主键
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # 基本信息
    name = Column(String(255), nullable=False)
    description = Column(Text)
    
    # 文件信息
    file_url = Column(Text, nullable=False)
    storage_key = Column(Text, nullable=False)
    file_size = Column(Integer)
    mime_type = Column(String(100), default="application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    
    # 模板元数据
    variables = Column(JSON)  # 变量定义列表
    structure = Column(JSON)  # 文档结构信息
    text_hash = Column(String(64), index=True)  # 用于缓存查询
    
    # 状态
    status = Column(String(50), default="active", index=True)  # active, archived, deleted
    is_public = Column(Boolean, default=False)
    
    # 统计
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime(timezone=True))
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # 关系
    user = relationship("User", back_populates="templates")
    generated_documents = relationship("GeneratedDocument", back_populates="template", cascade="all, delete-orphan")
    
    # 索引
    __table_args__ = (
        Index('idx_user_status', 'user_id', 'status'),
        Index('idx_text_hash', 'text_hash'),
    )
    
    def __repr__(self):
        return f"<Template(id={self.id}, name={self.name}, user_id={self.user_id})>"
