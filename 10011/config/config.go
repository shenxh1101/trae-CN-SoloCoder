package config

import "os"

type Config struct {
	ServerPort       string
	RedisAddr        string
	RedisPassword    string
	RedisDB          int
	SQLitePath       string
	RateLimit        int
	RateLimitWindow  int
	LogRetentionDays int
	ShortCodeLength  int
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

var AppConfig = Config{
	ServerPort:         getEnv("SERVER_PORT", ":8080"),
	RedisAddr:          getEnv("REDIS_ADDR", "localhost:6379"),
	RedisPassword:      getEnv("REDIS_PASSWORD", ""),
	RedisDB:            0,
	SQLitePath:         getEnv("SQLITE_PATH", "./shortlink.db"),
	RateLimit:          10,
	RateLimitWindow:    60,
	LogRetentionDays:   30,
	ShortCodeLength:    6,
}
