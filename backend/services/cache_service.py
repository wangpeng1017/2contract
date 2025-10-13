"""Redis 缓存服务"""
from typing import Optional, Any
import json
import logging
from datetime import timedelta

try:
    import redis
    from redis import Redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("Redis 未安装，使用内存缓存")

from config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """缓存服务（支持 Redis 或内存缓存）"""
    
    def __init__(self):
        """初始化缓存服务"""
        self.redis_client: Optional[Redis] = None
        self.memory_cache: dict = {}  # 内存缓存备用
        
        # 尝试连接 Redis
        if REDIS_AVAILABLE:
            try:
                self.redis_client = redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=5
                )
                # 测试连接
                self.redis_client.ping()
                logger.info("Redis 连接成功")
            except Exception as e:
                logger.warning(f"Redis 连接失败，使用内存缓存: {e}")
                self.redis_client = None
        else:
            logger.info("使用内存缓存")
    
    async def get(self, key: str) -> Optional[Any]:
        """
        获取缓存
        
        Args:
            key: 缓存键
            
        Returns:
            缓存值，如果不存在返回 None
        """
        try:
            if self.redis_client:
                # 使用 Redis
                value = self.redis_client.get(key)
                if value:
                    logger.debug(f"Redis 缓存命中: {key}")
                    return json.loads(value)
                return None
            else:
                # 使用内存缓存
                value = self.memory_cache.get(key)
                if value:
                    logger.debug(f"内存缓存命中: {key}")
                return value
        except Exception as e:
            logger.error(f"缓存读取失败: {e}")
            return None
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[int] = None
    ) -> bool:
        """
        设置缓存
        
        Args:
            key: 缓存键
            value: 缓存值（将被序列化为 JSON）
            ttl: 过期时间（秒），None 表示永不过期
            
        Returns:
            是否设置成功
        """
        try:
            if self.redis_client:
                # 使用 Redis
                serialized = json.dumps(value, ensure_ascii=False)
                if ttl:
                    self.redis_client.setex(key, ttl, serialized)
                else:
                    self.redis_client.set(key, serialized)
                logger.debug(f"Redis 缓存设置: {key} (TTL: {ttl})")
                return True
            else:
                # 使用内存缓存
                self.memory_cache[key] = value
                logger.debug(f"内存缓存设置: {key}")
                # 注意：内存缓存不支持 TTL
                return True
        except Exception as e:
            logger.error(f"缓存写入失败: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """
        删除缓存
        
        Args:
            key: 缓存键
            
        Returns:
            是否删除成功
        """
        try:
            if self.redis_client:
                result = self.redis_client.delete(key)
                logger.debug(f"Redis 缓存删除: {key}")
                return result > 0
            else:
                if key in self.memory_cache:
                    del self.memory_cache[key]
                    logger.debug(f"内存缓存删除: {key}")
                    return True
                return False
        except Exception as e:
            logger.error(f"缓存删除失败: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """
        检查缓存是否存在
        
        Args:
            key: 缓存键
            
        Returns:
            是否存在
        """
        try:
            if self.redis_client:
                return self.redis_client.exists(key) > 0
            else:
                return key in self.memory_cache
        except Exception as e:
            logger.error(f"缓存检查失败: {e}")
            return False
    
    async def clear(self, pattern: Optional[str] = None) -> int:
        """
        清空缓存
        
        Args:
            pattern: 键模式（仅 Redis 支持），None 表示清空所有
            
        Returns:
            删除的键数量
        """
        try:
            if self.redis_client:
                if pattern:
                    keys = self.redis_client.keys(pattern)
                    if keys:
                        count = self.redis_client.delete(*keys)
                        logger.info(f"Redis 缓存清空: {count} 个键")
                        return count
                    return 0
                else:
                    self.redis_client.flushdb()
                    logger.info("Redis 缓存全部清空")
                    return -1
            else:
                count = len(self.memory_cache)
                self.memory_cache.clear()
                logger.info(f"内存缓存清空: {count} 个键")
                return count
        except Exception as e:
            logger.error(f"缓存清空失败: {e}")
            return 0
    
    def is_connected(self) -> bool:
        """检查缓存服务是否连接"""
        if self.redis_client:
            try:
                self.redis_client.ping()
                return True
            except:
                return False
        return True  # 内存缓存始终可用


# 全局缓存服务实例
_cache_service: Optional[CacheService] = None


def get_cache_service() -> CacheService:
    """获取缓存服务单例"""
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
    return _cache_service
