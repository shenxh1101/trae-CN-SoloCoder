package database

import (
	"fmt"
	"log"
	"lottery-system/internal/config"
	"lottery-system/internal/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Init() {
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		config.AppConfig.DBUser,
		config.AppConfig.DBPassword,
		config.AppConfig.DBHost,
		config.AppConfig.DBPort,
		config.AppConfig.DBName,
	)

	var err error
	DB, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Database connected successfully")
}

func AutoMigrate() {
	err := DB.AutoMigrate(&models.User{}, &models.Prize{}, &models.Record{}, &models.SMSCode{})
	if err != nil {
		log.Fatalf("Failed to migrate: %v", err)
	}
	log.Println("Database migrated successfully")
}

func SeedPrizes() {
	var count int64
	DB.Model(&models.Prize{}).Count(&count)
	if count > 0 {
		return
	}

	prizes := []models.Prize{
		{Name: "一等奖 iPhone 15", Description: "最新款iPhone手机", ImageURL: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=200", Stock: 1, Probability: 0.01, SortOrder: 1},
		{Name: "二等奖 AirPods Pro", Description: "苹果无线耳机", ImageURL: "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=200", Stock: 5, Probability: 0.05, SortOrder: 2},
		{Name: "三等奖 100元优惠券", Description: "全场通用优惠券", ImageURL: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=200", Stock: 50, Probability: 0.14, SortOrder: 3},
		{Name: "四等奖 10元优惠券", Description: "满50可用", ImageURL: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=200", Stock: 200, Probability: 0.30, SortOrder: 4},
		{Name: "谢谢参与", Description: "感谢您的参与", ImageURL: "https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?w=200", Stock: 10000, Probability: 0.50, SortOrder: 5},
	}

	for _, prize := range prizes {
		DB.Create(&prize)
	}

	log.Println("Prizes seeded successfully")
}
