package repository

import (
	"shortlink/internal/model"
	"shortlink/pkg/sqlite"
	"time"
)

type AccessLogRepository struct{}

func NewAccessLogRepository() *AccessLogRepository {
	return &AccessLogRepository{}
}

func (r *AccessLogRepository) Create(log *model.AccessLog) error {
	return sqlite.DB.Create(log).Error
}

func (r *AccessLogRepository) CountVisits(code string) (int64, error) {
	var count int64
	err := sqlite.DB.Model(&model.AccessLog{}).Where("short_code = ?", code).Count(&count).Error
	return count, err
}

func (r *AccessLogRepository) CountUniqueIPs(code string) (int64, error) {
	var count int64
	err := sqlite.DB.Model(&model.AccessLog{}).Where("short_code = ?", code).Distinct("ip").Count(&count).Error
	return count, err
}

func (r *AccessLogRepository) GetLast24hTrend(code string) (map[string]int64, error) {
	trend := make(map[string]int64)
	now := time.Now()
	start := now.Add(-24 * time.Hour)

	type Result struct {
		Hour  string
		Count int64
	}

	var results []Result
	err := sqlite.DB.Model(&model.AccessLog{}).
		Select("strftime('%Y-%m-%d %H:00', accessed_at) as hour, count(*) as count").
		Where("short_code = ? AND accessed_at >= ?", code, start).
		Group("hour").
		Scan(&results).Error

	if err != nil {
		return nil, err
	}

	for _, r := range results {
		trend[r.Hour] = r.Count
	}

	return trend, nil
}

func (r *AccessLogRepository) CleanOldLogs(days int) error {
	cutoff := time.Now().AddDate(0, 0, -days)
	return sqlite.DB.Where("accessed_at < ?", cutoff).Delete(&model.AccessLog{}).Error
}
