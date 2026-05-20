package main

import (
	"log"
	"lottery-system/internal/config"
	"lottery-system/internal/handlers"
	"lottery-system/internal/middleware"
	"lottery-system/pkg/database"
	"lottery-system/pkg/redis"

	"github.com/gin-gonic/gin"
)

func main() {
	if err := config.Load(); err != nil {
		log.Printf("Warning: %v", err)
	}

	database.Init()
	redis.Init()

	database.AutoMigrate()
	database.SeedPrizes()

	r := gin.Default()

	r.Use(middleware.CORS())

	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/send-code", handlers.SendCode)
			auth.POST("/login", handlers.Login)
		}

		user := api.Group("/user")
		user.Use(middleware.Auth())
		{
			user.GET("/profile", handlers.GetProfile)
			user.POST("/draw", handlers.Draw)
			user.GET("/my-records", handlers.GetMyRecords)
		}

		prizes := api.Group("/prizes")
		{
			prizes.GET("", handlers.GetPrizes)
		}

		records := api.Group("/records")
		{
			records.GET("/recent", handlers.GetRecentRecords)
			records.GET("/stream", handlers.SSEStream)
		}

		admin := api.Group("/admin")
		admin.Use(middleware.AdminAuth())
		{
			admin.GET("/prizes", handlers.AdminGetPrizes)
			admin.POST("/prizes", handlers.AdminCreatePrize)
			admin.PUT("/prizes/:id", handlers.AdminUpdatePrize)
			admin.DELETE("/prizes/:id", handlers.AdminDeletePrize)
			admin.GET("/records", handlers.AdminGetRecords)
			admin.GET("/records/export", handlers.ExportRecords)
			admin.POST("/prizes/validate-probability", handlers.ValidateProbability)
		}
	}

	log.Println("Server starting on :8080")
	r.Run(":8080")
}
