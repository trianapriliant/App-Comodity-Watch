"""Redis configuration untuk ML service caching dan feature store."""

import json
import pickle
from typing import Any, Optional, Union

import redis.asyncio as redis
from redis.asyncio import Redis

from app.config.logging import ml_logger
from app.config.settings import settings


class RedisManager:
    """Redis manager untuk ML service operations."""
    
    def __init__(self):
        self.redis_client: Optional[Redis] = None
        self._connected = False
    
    async def connect(self) -> None:
        """Connect to Redis."""
        try:
            self.redis_client = redis.from_url(
                settings.redis_url,
                password=settings.redis_password,
                decode_responses=False,  # We'll handle encoding manually
                retry_on_timeout=True,
                socket_connect_timeout=5,
                socket_timeout=5,
            )
            
            # Test connection
            await self.redis_client.ping()
            self._connected = True
            
            ml_logger.info("Redis connected successfully")
            
        except Exception as e:
            ml_logger.error("Failed to connect to Redis", error=str(e))
            raise e
    
    async def disconnect(self) -> None:
        """Disconnect from Redis."""
        if self.redis_client:
            await self.redis_client.close()
            self._connected = False
            ml_logger.info("Redis disconnected")
    
    async def health_check(self) -> bool:
        """Check Redis connection health."""
        try:
            if self.redis_client:
                await self.redis_client.ping()
                return True
            return False
        except Exception:
            return False
    
    # Cache Operations
    async def get_cache(self, key: str) -> Optional[Any]:
        """Get cached data."""
        if not self._connected or not self.redis_client:
            return None
        
        try:
            start_time = ml_logger.logger.bind(cache_key=key)
            
            data = await self.redis_client.get(key)
            
            if data is None:
                ml_logger.log_cache_operation("get", key, hit=False)
                return None
            
            # Try to decode as JSON first, then pickle
            try:
                result = json.loads(data.decode('utf-8'))
                ml_logger.log_cache_operation("get", key, hit=True)
                return result
            except (json.JSONDecodeError, UnicodeDecodeError):
                result = pickle.loads(data)
                ml_logger.log_cache_operation("get", key, hit=True)
                return result
                
        except Exception as e:
            ml_logger.error("Cache get operation failed", key=key, error=str(e))
            return None
    
    async def set_cache(
        self,
        key: str,
        value: Any,
        expire: int = 3600,
        use_pickle: bool = False
    ) -> bool:
        """Set cached data."""
        if not self._connected or not self.redis_client:
            return False
        
        try:
            if use_pickle:
                data = pickle.dumps(value)
            else:
                data = json.dumps(value, default=str).encode('utf-8')
            
            await self.redis_client.setex(key, expire, data)
            ml_logger.log_cache_operation("set", key)
            return True
            
        except Exception as e:
            ml_logger.error("Cache set operation failed", key=key, error=str(e))
            return False
    
    async def delete_cache(self, key: str) -> bool:
        """Delete cached data."""
        if not self._connected or not self.redis_client:
            return False
        
        try:
            result = await self.redis_client.delete(key)
            ml_logger.log_cache_operation("delete", key)
            return result > 0
            
        except Exception as e:
            ml_logger.error("Cache delete operation failed", key=key, error=str(e))
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        if not self._connected or not self.redis_client:
            return False
        
        try:
            result = await self.redis_client.exists(key)
            return result > 0
        except Exception:
            return False
    
    # Feature Store Operations
    async def store_features(
        self,
        feature_key: str,
        features: dict,
        expire: int = 86400  # 24 hours
    ) -> bool:
        """Store engineered features."""
        cache_key = f"features:{feature_key}"
        return await self.set_cache(cache_key, features, expire, use_pickle=True)
    
    async def get_features(self, feature_key: str) -> Optional[dict]:
        """Get stored features."""
        cache_key = f"features:{feature_key}"
        return await self.get_cache(cache_key)
    
    # Model Cache Operations
    async def cache_model_predictions(
        self,
        model_key: str,
        predictions: dict,
        expire: int = 1800  # 30 minutes
    ) -> bool:
        """Cache model predictions."""
        cache_key = f"predictions:{model_key}"
        return await self.set_cache(cache_key, predictions, expire)
    
    async def get_cached_predictions(self, model_key: str) -> Optional[dict]:
        """Get cached predictions."""
        cache_key = f"predictions:{model_key}"
        return await self.get_cache(cache_key)
    
    # Anomaly Detection Cache
    async def cache_anomaly_scores(
        self,
        anomaly_key: str,
        scores: dict,
        expire: int = 3600  # 1 hour
    ) -> bool:
        """Cache anomaly detection scores."""
        cache_key = f"anomaly:{anomaly_key}"
        return await self.set_cache(cache_key, scores, expire)
    
    async def get_cached_anomaly_scores(self, anomaly_key: str) -> Optional[dict]:
        """Get cached anomaly scores."""
        cache_key = f"anomaly:{anomaly_key}"
        return await self.get_cache(cache_key)
    
    # Model Metadata Cache
    async def cache_model_metadata(
        self,
        model_name: str,
        metadata: dict,
        expire: int = 86400  # 24 hours
    ) -> bool:
        """Cache model metadata."""
        cache_key = f"model_metadata:{model_name}"
        return await self.set_cache(cache_key, metadata, expire)
    
    async def get_model_metadata(self, model_name: str) -> Optional[dict]:
        """Get cached model metadata."""
        cache_key = f"model_metadata:{model_name}"
        return await self.get_cache(cache_key)
    
    # Training State Cache
    async def set_training_state(
        self,
        training_id: str,
        state: dict,
        expire: int = 7200  # 2 hours
    ) -> bool:
        """Set training state."""
        cache_key = f"training:{training_id}"
        return await self.set_cache(cache_key, state, expire)
    
    async def get_training_state(self, training_id: str) -> Optional[dict]:
        """Get training state."""
        cache_key = f"training:{training_id}"
        return await self.get_cache(cache_key)
    
    # Data Validation Cache
    async def cache_data_validation(
        self,
        validation_key: str,
        validation_result: dict,
        expire: int = 3600  # 1 hour
    ) -> bool:
        """Cache data validation results."""
        cache_key = f"validation:{validation_key}"
        return await self.set_cache(cache_key, validation_result, expire)
    
    async def get_data_validation(self, validation_key: str) -> Optional[dict]:
        """Get cached data validation results."""
        cache_key = f"validation:{validation_key}"
        return await self.get_cache(cache_key)
    
    # Utility Methods
    def generate_cache_key(self, *args) -> str:
        """Generate cache key from arguments."""
        return ":".join(str(arg) for arg in args)
    
    async def clear_pattern(self, pattern: str) -> int:
        """Clear cache keys matching pattern."""
        if not self._connected or not self.redis_client:
            return 0
        
        try:
            keys = await self.redis_client.keys(pattern)
            if keys:
                return await self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            ml_logger.error("Failed to clear cache pattern", pattern=pattern, error=str(e))
            return 0
    
    async def get_cache_stats(self) -> dict:
        """Get cache statistics."""
        if not self._connected or not self.redis_client:
            return {}
        
        try:
            info = await self.redis_client.info()
            return {
                "used_memory": info.get("used_memory_human", "N/A"),
                "connected_clients": info.get("connected_clients", 0),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "hit_rate": (
                    info.get("keyspace_hits", 0) / 
                    max(info.get("keyspace_hits", 0) + info.get("keyspace_misses", 0), 1)
                ) * 100
            }
        except Exception as e:
            ml_logger.error("Failed to get cache stats", error=str(e))
            return {}


# Global Redis manager instance
redis_manager = RedisManager()


# Context manager untuk Redis operations
class RedisContext:
    """Context manager untuk Redis operations dengan auto-retry."""
    
    def __init__(self, operation_name: str):
        self.operation_name = operation_name
    
    async def __aenter__(self):
        if not redis_manager._connected:
            await redis_manager.connect()
        return redis_manager
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            ml_logger.error(
                f"Redis operation failed: {self.operation_name}",
                error=str(exc_val)
            )
        return False


# Utility functions untuk common cache operations
async def get_prediction_cache_key(
    commodity_code: str,
    region_code: str = None,
    model_name: str = "prophet",
    horizon_days: int = 7
) -> str:
    """Generate cache key untuk predictions."""
    key_parts = [commodity_code, model_name, str(horizon_days)]
    if region_code:
        key_parts.append(region_code)
    return redis_manager.generate_cache_key(*key_parts)


async def get_feature_cache_key(
    commodity_code: str,
    region_code: str = None,
    feature_type: str = "technical",
    window_days: int = 30
) -> str:
    """Generate cache key untuk features."""
    key_parts = [commodity_code, feature_type, str(window_days)]
    if region_code:
        key_parts.append(region_code)
    return redis_manager.generate_cache_key(*key_parts)
