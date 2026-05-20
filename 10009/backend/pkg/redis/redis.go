package redis

import (
	"context"
	"fmt"
	"log"
	"lottery-system/internal/config"
	"time"

	"github.com/go-redis/redis/v8"
)

var Client *redis.Client
var Ctx = context.Background()

func Init() {
	addr := fmt.Sprintf("%s:%s", config.AppConfig.RedisHost, config.AppConfig.RedisPort)

	Client = redis.NewClient(&redis.Options{
		Addr: addr,
	})

	_, err := Client.Ping(Ctx).Result()
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	log.Println("Redis connected successfully")
}

func Lock(key string, expiration time.Duration) (bool, error) {
	ok, err := Client.SetNX(Ctx, key, "1", expiration).Result()
	if err != nil {
		return false, err
	}
	return ok, nil
}

func Unlock(key string) error {
	return Client.Del(Ctx, key).Err()
}

func GetUserDrawCount(userID uint, date string) (int, error) {
	key := fmt.Sprintf("draw_count:%d:%s", userID, date)
	count, err := Client.Get(Ctx, key).Int()
	if err == redis.Nil {
		return 0, nil
	}
	return count, err
}

func IncrementUserDrawCount(userID uint, date string) error {
	key := fmt.Sprintf("draw_count:%d:%s", userID, date)
	pipe := Client.TxPipeline()
	pipe.Incr(Ctx, key)
	pipe.Expire(Ctx, key, 24*time.Hour)
	_, err := pipe.Exec(Ctx)
	return err
}

func AddRecentRecord(record string) error {
	key := "recent_records"
	pipe := Client.TxPipeline()
	pipe.LPush(Ctx, key, record)
	pipe.LTrim(Ctx, key, 0, 99)
	_, err := pipe.Exec(Ctx)
	return err
}

func GetRecentRecords() ([]string, error) {
	return Client.LRange(Ctx, "recent_records", 0, 19).Result()
}
