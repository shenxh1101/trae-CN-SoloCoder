import time
import uuid
from fastapi import HTTPException, status
from .config import settings
from .redis_client import get_redis


class RateLimiter:
    def __init__(self, max_requests: int = None, period: int = None):
        self.max_requests = max_requests or settings.RATE_LIMIT_REQUESTS
        self.period = period or settings.RATE_LIMIT_PERIOD

    async def check_rate_limit(self, user_id: int) -> bool:
        redis = await get_redis()
        key = f"rate_limit:{user_id}"
        
        current = int(time.time())
        window_start = current - self.period
        
        await redis.zremrangebyscore(key, 0, window_start)
        
        request_count = await redis.zcard(key)
        
        if request_count >= self.max_requests:
            return False
        
        unique_member = f"{current}:{uuid.uuid4().hex}"
        await redis.zadd(key, {unique_member: current})
        await redis.expire(key, self.period)
        
        return True

    async def __call__(self, user_id: int):
        if not await self.check_rate_limit(user_id):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Limit: {self.max_requests} per {self.period} seconds"
            )


rate_limiter = RateLimiter()
