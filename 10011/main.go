package main

import (
	"log"
	"shortlink/config"
	"shortlink/internal/handler"
	"shortlink/internal/middleware"
	"shortlink/internal/model"
	"shortlink/internal/service"
	"shortlink/pkg/redis"
	"shortlink/pkg/sqlite"

	"github.com/gin-gonic/gin"
)

func main() {
	redis.Init()
	log.Println("Redis connected successfully")

	err := sqlite.Init()
	if err != nil {
		log.Fatalf("Failed to connect to SQLite: %v", err)
	}
	log.Println("SQLite connected successfully")

	err = sqlite.DB.AutoMigrate(&model.ShortLink{}, &model.AccessLog{})
	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}
	log.Println("Database migrated successfully")

	shortLinkService := service.NewShortLinkService()
	scheduler := service.NewScheduler(shortLinkService)
	scheduler.Start()
	defer scheduler.Stop()

	handler := handler.NewShortLinkHandler()

	r := gin.Default()

	api := r.Group("/api")
	{
		api.POST("/shorten", middleware.RateLimitMiddleware(), handler.CreateShortLink)
		api.PUT("/:code", handler.UpdateShortLink)
		api.DELETE("/:code", handler.DeleteShortLink)
		api.GET("/:code/stats", handler.GetStats)
	}

	r.GET("/:code", handler.Redirect)

	log.Printf("Server starting on port %s", config.AppConfig.ServerPort)
	log.Fatal(r.Run(config.AppConfig.ServerPort))
}
