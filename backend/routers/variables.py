"""变量提取路由 - 模块二"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import logging

from services.variable_extractor import get_variable_extractor, VariableExtractor
from services.cache_service import get_cache_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/variables", tags=["variables"])


class ExtractRequest(BaseModel):
    """变量提取请求"""
    text: str = Field(..., description="合同文本内容", min_length=10)
    examples: Optional[List[Dict]] = Field(None, description="可选的示例列表")
    use_cache: bool = Field(True, description="是否使用缓存")


class Variable(BaseModel):
    """变量模型"""
    name: str = Field(..., description="变量英文标识符")
    label: str = Field(..., description="显示标签")
    type: str = Field(..., description="数据类型")
    required: bool = Field(True, description="是否必填")
    description: Optional[str] = Field(None, description="变量说明")
    placeholder: Optional[str] = Field(None, description="输入提示")
    default: Optional[str] = Field(None, description="默认值")
    options: Optional[List[str]] = Field(None, description="选项列表（select 类型）")
    format: Optional[str] = Field(None, description="格式说明")


class ExtractResponse(BaseModel):
    """变量提取响应"""
    variables: List[Variable]
    count: int = Field(..., description="变量数量")
    from_cache: bool = Field(False, description="是否从缓存获取")
    text_hash: str = Field(..., description="文本哈希值")


@router.post("/extract", response_model=ExtractResponse)
async def extract_variables(request: ExtractRequest):
    """
    从合同文本中提取变量
    
    - **text**: 合同文本内容（至少 10 个字符）
    - **examples**: 可选的示例列表
    - **use_cache**: 是否使用缓存（默认 true）
    
    Returns:
        变量列表，包含 name, label, type, required 等字段
    """
    try:
        # 获取服务
        extractor = get_variable_extractor()
        cache = get_cache_service()
        
        # 计算文本哈希
        text_hash = VariableExtractor.compute_text_hash(request.text)
        
        # 检查缓存
        cached_variables = None
        if request.use_cache:
            cache_key = f"variables:{text_hash}"
            cached_variables = await cache.get(cache_key)
            
            if cached_variables:
                logger.info(f"从缓存获取变量: {text_hash[:8]}...")
                return ExtractResponse(
                    variables=[Variable(**var) for var in cached_variables],
                    count=len(cached_variables),
                    from_cache=True,
                    text_hash=text_hash
                )
        
        # 调用 AI 提取
        logger.info(f"开始提取变量: 文本长度={len(request.text)}")
        variables = await extractor.extract_variables(
            text=request.text,
            examples=request.examples
        )
        
        # 保存到缓存（7 天）
        if request.use_cache and variables:
            cache_key = f"variables:{text_hash}"
            await cache.set(cache_key, variables, ttl=7 * 24 * 3600)
            logger.info(f"变量已缓存: {cache_key}")
        
        logger.info(f"成功提取 {len(variables)} 个变量")
        
        return ExtractResponse(
            variables=[Variable(**var) for var in variables],
            count=len(variables),
            from_cache=False,
            text_hash=text_hash
        )
        
    except ValueError as e:
        logger.error(f"变量提取失败: {e}")
        raise HTTPException(400, f"变量提取失败: {str(e)}")
    except Exception as e:
        logger.error(f"变量提取异常: {e}", exc_info=True)
        raise HTTPException(500, f"服务器错误: {str(e)}")


@router.get("/cache/stats")
async def get_cache_stats():
    """
    获取缓存统计信息
    """
    cache = get_cache_service()
    
    return {
        "connected": cache.is_connected(),
        "backend": "redis" if cache.redis_client else "memory",
        "status": "healthy" if cache.is_connected() else "disconnected"
    }


@router.delete("/cache/clear")
async def clear_cache(pattern: Optional[str] = None):
    """
    清空缓存
    
    - **pattern**: 键模式（可选），例如 "variables:*"
    """
    try:
        cache = get_cache_service()
        count = await cache.clear(pattern)
        
        return {
            "success": True,
            "message": f"成功清空 {count} 个缓存",
            "pattern": pattern or "all"
        }
    except Exception as e:
        logger.error(f"清空缓存失败: {e}")
        raise HTTPException(500, f"清空缓存失败: {str(e)}")
