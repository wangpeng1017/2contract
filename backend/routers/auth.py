"""认证路由（简化版）"""
from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register")
async def register():
    """用户注册（TODO）"""
    return {"message": "注册功能待实现"}


@router.post("/login")
async def login():
    """用户登录（TODO）"""
    return {"message": "登录功能待实现"}


@router.post("/logout")
async def logout():
    """用户登出（TODO）"""
    return {"message": "登出功能待实现"}
