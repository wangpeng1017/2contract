"""生成文档模型"""
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, JSON, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from models.database import Base


class GeneratedDocument(Base):
    """生成的合同文档模型"""
    
    __tablename__ = "generated_documents"
    
    # 主键
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    template_id = Column(String(36), ForeignKey("templates.id", ondelete="CASCADE"), nullable=False)
    
    # 输入数据
    input_data = Column(JSON, nullable=False)  # 用户填写的表单数据
    
    # 输出文件
    output_url = Column(Text, nullable=False)
    output_filename = Column(String(255), nullable=False)
    storage_key = Column(Text, nullable=False)
    file_size = Column(Integer)
    
    # 元数据
    generation_time = Column(Float)  # 生成耗时（毫秒）
    status = Column(String(50), default="completed", index=True)  # pending, completed, failed
    error_message = Column(Text)
    
    # 请求信息
    ip_address = Column(String(45))
    user_agent = Column(Text)
    
    # 时间戳
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # 关系
    user = relationship("User", back_populates="generated_documents")
    template = relationship("Template", back_populates="generated_documents")
    
    # 索引
    __table_args__ = (
        Index('idx_user_id', 'user_id'),
        Index('idx_template_id', 'template_id'),
        Index('idx_created_at', 'created_at'),
        Index('idx_status', 'status'),
    )
    
    def __repr__(self):
        return f"<GeneratedDocument(id={self.id}, template_id={self.template_id}, status={self.status})>"
