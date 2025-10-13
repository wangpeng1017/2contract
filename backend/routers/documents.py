"""文档处理路由"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import logging

from services.document_parser import DocumentParser, DocumentParserFactory
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
