package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	Phone     string         `gorm:"size:20;uniqueIndex;not null" json:"phone"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type Prize struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	Name          string         `gorm:"size:100;not null" json:"name"`
	Description   string         `gorm:"size:500" json:"description"`
	ImageURL      string         `gorm:"size:500" json:"image_url"`
	Stock         int            `gorm:"not null;default:0" json:"stock"`
	Probability   float64        `gorm:"type:decimal(5,4);not null" json:"probability"`
	IsEnabled     bool           `gorm:"default:true" json:"is_enabled"`
	SortOrder     int            `gorm:"default:0" json:"sort_order"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"-"`
}

type Record struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	UserID    uint           `gorm:"not null;index" json:"user_id"`
	UserPhone string         `gorm:"size:20;index" json:"user_phone"`
	PrizeID   uint           `gorm:"not null" json:"prize_id"`
	PrizeName string         `gorm:"size:100" json:"prize_name"`
	IsWin     bool           `gorm:"default:false" json:"is_win"`
	CreatedAt time.Time      `json:"created_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

type SMSCode struct {
	ID        uint           `gorm:"primaryKey"`
	Phone     string         `gorm:"size:20;uniqueIndex;not null"`
	Code      string         `gorm:"size:10;not null"`
	ExpiresAt time.Time      `gorm:"not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
	DeletedAt gorm.DeletedAt `gorm:"index"`
}
