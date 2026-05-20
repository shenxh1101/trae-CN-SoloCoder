package redis

import (
	"context"
	"shortlink/config"

	"github.com/go-redis/redis/v8"
)

var Client *redis.Client
var Ctx = context.Background()

func Init() {
	Client = redis.NewClient(&redis.Options{
		Addr:     config.AppConfig.RedisAddr,
		Password: config.AppConfig.RedisPassword,
		DB:       config.AppConfig.RedisDB,
	})
}

func GetClient() *redis.Client {
	return Client
}
