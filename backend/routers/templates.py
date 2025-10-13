"""模板管理路由（占位符）"""
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/templates", tags=["templates"])


@router.get("/")
async def list_templates():
    """列出模板（TODO）"""
    return {"message": "模板列表功能待实现"}


@router.post("/")
async def create_template():
    """创建模板（TODO）"""
    return {"message": "创建模板功能待实现"}


@router.get("/{template_id}")
async def get_template():
    """获取模板详情（TODO）"""
    return {"message": "模板详情功能待实现"}
