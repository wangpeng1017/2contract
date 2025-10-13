"""MinIO 对象存储服务 - 模块四"""
from minio import Minio
from minio.error import S3Error
from typing import Optional
import io
import logging
from datetime import timedelta

from config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """MinIO 对象存储服务"""
    
    def __init__(self):
        """初始化 MinIO 客户端"""
        try:
            self.client = Minio(
                endpoint=settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_SECURE
            )
            self.bucket = settings.MINIO_BUCKET
            self._ensure_bucket()
            logger.info(f"MinIO 客户端初始化成功，存储桶: {self.bucket}")
        except Exception as e:
            logger.error(f"MinIO 客户端初始化失败: {e}")
            raise
    
    def _ensure_bucket(self):
        """确保存储桶存在"""
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
                logger.info(f"创建存储桶: {self.bucket}")
            else:
                logger.debug(f"存储桶已存在: {self.bucket}")
        except S3Error as e:
            logger.error(f"存储桶创建/检查失败: {e}")
            raise
    
    async def upload(
        self, 
        object_name: str, 
        data: bytes, 
        content_type: str = "application/octet-stream",
        metadata: Optional[dict] = None
    ) -> str:
        """
        上传文件到 MinIO
        
        Args:
            object_name: 对象名称（路径）
            data: 文件字节数据
            content_type: MIME 类型
            metadata: 元数据字典
            
        Returns:
            对象的访问 URL
        """
        try:
            # 上传对象
            self.client.put_object(
                bucket_name=self.bucket,
                object_name=object_name,
                data=io.BytesIO(data),
                length=len(data),
                content_type=content_type,
                metadata=metadata
            )
            
            # 构造访问 URL
            url = self._build_url(object_name)
            logger.info(f"文件上传成功: {object_name}, 大小: {len(data)} 字节")
            return url
            
        except S3Error as e:
            logger.error(f"文件上传失败: {e}")
            raise Exception(f"上传失败: {str(e)}")
    
    async def download(self, object_name: str) -> bytes:
        """
        从 MinIO 下载文件
        
        Args:
            object_name: 对象名称（路径）
            
        Returns:
            文件字节数据
        """
        try:
            response = self.client.get_object(self.bucket, object_name)
            data = response.read()
            response.close()
            response.release_conn()
            
            logger.info(f"文件下载成功: {object_name}, 大小: {len(data)} 字节")
            return data
            
        except S3Error as e:
            logger.error(f"文件下载失败: {e}")
            raise Exception(f"下载失败: {str(e)}")
    
    async def download_from_url(self, url: str) -> bytes:
        """
        从 URL 下载文件
        
        Args:
            url: 完整的对象 URL
            
        Returns:
            文件字节数据
        """
        # 从 URL 提取对象名称
        object_name = url.split(f"/{self.bucket}/")[-1]
        return await self.download(object_name)
    
    async def delete(self, object_name: str) -> bool:
        """
        删除文件
        
        Args:
            object_name: 对象名称（路径）
            
        Returns:
            是否删除成功
        """
        try:
            self.client.remove_object(self.bucket, object_name)
            logger.info(f"文件删除成功: {object_name}")
            return True
        except S3Error as e:
            logger.error(f"文件删除失败: {e}")
            return False
    
    def get_presigned_url(
        self, 
        object_name: str, 
        expires: timedelta = timedelta(hours=1)
    ) -> str:
        """
        获取预签名 URL（用于临时访问）
        
        Args:
            object_name: 对象名称（路径）
            expires: 过期时间
            
        Returns:
            预签名 URL
        """
        try:
            url = self.client.presigned_get_object(
                bucket_name=self.bucket,
                object_name=object_name,
                expires=expires
            )
            logger.debug(f"生成预签名 URL: {object_name}")
            return url
        except S3Error as e:
            logger.error(f"生成预签名 URL 失败: {e}")
            raise Exception(f"生成 URL 失败: {str(e)}")
    
    def _build_url(self, object_name: str) -> str:
        """
        构造对象访问 URL
        
        Args:
            object_name: 对象名称
            
        Returns:
            完整的访问 URL
        """
        protocol = "https" if settings.MINIO_SECURE else "http"
        return f"{protocol}://{settings.MINIO_ENDPOINT}/{self.bucket}/{object_name}"
    
    async def exists(self, object_name: str) -> bool:
        """
        检查对象是否存在
        
        Args:
            object_name: 对象名称
            
        Returns:
            是否存在
        """
        try:
            self.client.stat_object(self.bucket, object_name)
            return True
        except S3Error:
            return False
    
    async def list_objects(self, prefix: str = "", recursive: bool = True) -> list:
        """
        列出对象
        
        Args:
            prefix: 对象名称前缀
            recursive: 是否递归列出
            
        Returns:
            对象信息列表
        """
        try:
            objects = self.client.list_objects(
                bucket_name=self.bucket,
                prefix=prefix,
                recursive=recursive
            )
            
            result = []
            for obj in objects:
                result.append({
                    "name": obj.object_name,
                    "size": obj.size,
                    "last_modified": obj.last_modified.isoformat(),
                    "etag": obj.etag
                })
            
            logger.info(f"列出对象: 前缀={prefix}, 数量={len(result)}")
            return result
            
        except S3Error as e:
            logger.error(f"列出对象失败: {e}")
            raise Exception(f"列出对象失败: {str(e)}")


# 全局存储服务实例
_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """获取存储服务单例"""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
