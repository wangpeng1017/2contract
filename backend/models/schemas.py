"""
数据模型定义
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
from datetime import datetime


class VariableSchema(BaseModel):
    """合同变量模型"""
    name: str = Field(..., description="变量名称")
    type: str = Field(..., description="变量类型: text, date, number, email")
    description: str = Field(..., description="变量描述")
    required: bool = Field(True, description="是否必填")
    default_value: Optional[str] = Field(None, description="默认值")


class TemplateUploadResponse(BaseModel):
    """模板上传响应"""
    template_id: str = Field(..., description="模板唯一ID")
    filename: str = Field(..., description="文件名")
    variables: List[VariableSchema] = Field(..., description="提取的变量列表")
    upload_time: datetime = Field(..., description="上传时间")
    message: str = Field("模板上传成功", description="响应消息")


class GenerateContractRequest(BaseModel):
    """生成合同请求"""
    template_id: str = Field(..., description="模板ID")
    data: Dict[str, Any] = Field(..., description="变量数据，键为变量名，值为填写的值")
    output_filename: Optional[str] = Field(None, description="输出文件名")


class GenerateContractResponse(BaseModel):
    """生成合同响应"""
    contract_id: str = Field(..., description="合同唯一ID")
    filename: str = Field(..., description="生成的文件名")
    download_url: str = Field(..., description="下载链接")
    generated_time: datetime = Field(..., description="生成时间")
    message: str = Field("合同生成成功", description="响应消息")


class ErrorResponse(BaseModel):
    """错误响应"""
    error: str = Field(..., description="错误类型")
    message: str = Field(..., description="错误详情")
    detail: Optional[str] = Field(None, description="额外信息")


class HealthResponse(BaseModel):
    """健康检查响应"""
    status: str = Field("healthy", description="服务状态")
    app_name: str = Field(..., description="应用名称")
    version: str = Field(..., description="应用版本")
    timestamp: datetime = Field(..., description="检查时间")
