package model

import (
	"time"
)

type ShortLink struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ShortCode string    `gorm:"uniqueIndex;size:10" json:"short_code"`
	OriginalURL string  `gorm:"size:2048" json:"original_url"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type AccessLog struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	ShortCode  string    `gorm:"index;size:10" json:"short_code"`
	IP         string    `gorm:"size:45" json:"ip"`
	UserAgent  string    `gorm:"size:512" json:"user_agent"`
	AccessedAt time.Time `gorm:"index" json:"accessed_at"`
}

type ShortLinkStats struct {
	ShortCode       string            `json:"short_code"`
	TotalVisits     int64             `json:"total_visits"`
	UniqueIPs       int64             `json:"unique_ips"`
	Last24hTrend    map[string]int64  `json:"last_24h_trend"`
}
