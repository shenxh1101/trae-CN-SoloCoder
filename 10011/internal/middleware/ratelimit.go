package middleware

import (
	"fmt"
	"net/http"
	"shortlink/config"
	"shortlink/pkg/redis"
	"time"

	"github.com/gin-gonic/gin"
)

func RateLimitMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		key := fmt.Sprintf("rate_limit:%s", ip)
		window := time.Duration(config.AppConfig.RateLimitWindow) * time.Second

		count, err := redis.Client.Incr(redis.Ctx, key).Result()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
			c.Abort()
			return
		}

		if count == 1 {
			redis.Client.Expire(redis.Ctx, key, window)
		}

		if count > int64(config.AppConfig.RateLimit) {
			ttl, _ := redis.Client.TTL(redis.Ctx, key).Result()
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "Rate limit exceeded",
				"retry_after": int(ttl.Seconds()),
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
