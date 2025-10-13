"""文档处理路由"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
import logging
import uuid
from datetime import datetime, timedelta

from services.document_parser import DocumentParser, DocumentParserFactory
from services.variable_extractor import get_variable_extractor
from services.storage_service import get_storage_service
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


class ParseResponse(BaseModel):
    """文档解析响应"""
    text: str
    structure: dict
    metadata: dict
    placeholders: list
    filename: str
    size: int
    valid: bool
    warnings: list = []


class UploadAndExtractResponse(BaseModel):
    """上传模板并提取变量响应"""
    template_id: str = Field(..., description="模板唯一ID")
    filename: str = Field(..., description="文件名")
    file_size: int = Field(..., description="文件大小")
    storage_key: str = Field(..., description="存储键")
    storage_url: str = Field(..., description="MinIO存储URL")
    template_download_url: str = Field(..., description="模板下载预签名URL")
    
    # 文档信息
    text_length: int = Field(..., description="文本长度")
    structure: dict = Field(..., description="文档结构")
    metadata: dict = Field(..., description="元数据")
    placeholders: list = Field(..., description="占位符列表")
    
    # 变量信息
    variables: List[dict] = Field(..., description="提取的变量列表")
    variables_count: int = Field(..., description="变量数量")
    text_hash: str = Field(..., description="文本哈希值")
    
    # 时间信息
    uploaded_at: str = Field(..., description="上传时间")
    expires_at: str = Field(..., description="模板下载链接过期时间")


@router.post("/parse", response_model=ParseResponse)
async def parse_document(file: UploadFile = File(...)):
    """
    解析上传的文档
    
    - **file**: .docx 格式的文档文件
    """
    # 验证文件类型
    if not file.filename.endswith('.docx'):
        raise HTTPException(400, "只支持 .docx 格式的文档")
    
    # 验证文件大小
    content = await file.read()
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(
            400, 
            f"文件大小超过限制（最大 {settings.MAX_UPLOAD_SIZE_MB}MB）"
        )
    
    try:
        # 创建解析器
        parser = DocumentParserFactory.create_parser(content, ".docx")
        
        # 验证文档
        validation = parser.validate()
        if not validation["valid"]:
            raise HTTPException(400, f"文档无效: {validation.get('error', '未知错误')}")
        
        # 提取信息
        text = parser.extract_text()
        structure = parser.get_structure()
        metadata = parser.get_metadata()
        placeholders = parser.extract_placeholders()
        
        logger.info(f"成功解析文档: {file.filename}, 大小: {len(content)} 字节")
        
        return ParseResponse(
            text=text,
            structure=structure,
            metadata=metadata,
            placeholders=placeholders,
            filename=file.filename,
            size=len(content),
            valid=True,
            warnings=validation.get("warnings", [])
        )
        
    except ValueError as e:
        logger.error(f"文档解析失败: {e}")
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.error(f"文档解析异常: {e}", exc_info=True)
        raise HTTPException(500, f"文档解析失败: {str(e)}")


@router.post("/validate")
async def validate_document(file: UploadFile = File(...)):
    """
    快速验证文档
    
    - **file**: .docx 格式的文档文件
    """
    if not file.filename.endswith('.docx'):
        raise HTTPException(400, "只支持 .docx 格式的文档")
    
    content = await file.read()
    
    try:
        parser = DocumentParserFactory.create_parser(content, ".docx")
        validation = parser.validate()
        
        return {
            "filename": file.filename,
            "size": len(content),
            **validation
        }
    except Exception as e:
        logger.error(f"文档验证失败: {e}")
        raise HTTPException(400, f"文档验证失败: {str(e)}")


@router.post("/upload-and-extract", response_model=UploadAndExtractResponse)
async def upload_and_extract_variables(file: UploadFile = File(...)):
    """
    一站式接口：上传模板并提取变量
    
    - **file**: .docx 格式的文档文件
    
    返回模板信息、变量定义和下载链接
    """
    # 验证文件类型
    if not file.filename.endswith('.docx'):
        raise HTTPException(400, "只支持 .docx 格式的文档")
    
    # 读取文件内容
    content = await file.read()
    
    # 验证文件大小
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(
            400, 
            f"文件大小超过限制（最大 {settings.MAX_UPLOAD_SIZE_MB}MB）"
        )
    
    try:
        # 生成唯一ID
        template_id = str(uuid.uuid4())
        upload_time = datetime.now()
        
        # 1. 上传模板到 MinIO
        storage = get_storage_service()
        storage_key = f"templates/{upload_time.strftime('%Y%m%d')}/{template_id}_{file.filename}"
        
        storage_url = await storage.upload(
            object_name=storage_key,
            data=content,
            content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            metadata={
                "template_id": template_id,
                "original_filename": file.filename,
                "upload_time": upload_time.isoformat()
            }
        )
        
        # 2. 解析文档（使用阅读顺序）
        parser = DocumentParserFactory.create_parser(content, ".docx")
        
        # 验证文档
        validation = parser.validate()
        if not validation["valid"]:
            raise HTTPException(400, f"文档无效: {validation.get('error', '未知错误')}")
        
        # 提取信息
        text = parser.extract_text()  # 现在使用阅读顺序的解析
        structure = parser.get_structure()
        metadata = parser.get_metadata()
        placeholders = parser.extract_placeholders()
        
        # 3. 提取变量
        extractor = get_variable_extractor()
        variables = await extractor.extract_variables(text=text)
        text_hash = extractor.compute_text_hash(text)
        
        # 4. 生成模板下载预签名 URL（3小时有效）
        template_download_url = storage.get_presigned_url(
            object_name=storage_key,
            expires=timedelta(hours=3)
        )
        expires_at = (upload_time + timedelta(hours=3)).isoformat()
        
        logger.info(
            f"模板上传成功: template_id={template_id}, "
            f"文件={file.filename}, 变量数={len(variables)}"
        )
        
        return UploadAndExtractResponse(
            template_id=template_id,
            filename=file.filename,
            file_size=len(content),
            storage_key=storage_key,
            storage_url=storage_url,
            template_download_url=template_download_url,
            
            # 文档信息
            text_length=len(text),
            structure=structure,
            metadata=metadata,
            placeholders=placeholders,
            
            # 变量信息
            variables=variables,
            variables_count=len(variables),
            text_hash=text_hash,
            
            # 时间信息
            uploaded_at=upload_time.isoformat(),
            expires_at=expires_at
        )
        
    except ValueError as e:
        logger.error(f"模板上传失败: {e}")
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.error(f"模板上传异常: {e}", exc_info=True)
        raise HTTPException(500, f"服务器错误: {str(e)}")
