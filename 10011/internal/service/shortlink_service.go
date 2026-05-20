package service

import (
	"crypto/rand"
	"errors"
	"math/big"
	"shortlink/config"
	"shortlink/internal/model"
	"shortlink/internal/repository"
	"shortlink/pkg/redis"
	"time"
)

const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

type ShortLinkService struct {
	repo    *repository.ShortLinkRepository
	logRepo *repository.AccessLogRepository
}

func NewShortLinkService() *ShortLinkService {
	return &ShortLinkService{
		repo:    repository.NewShortLinkRepository(),
		logRepo: repository.NewAccessLogRepository(),
	}
}

func (s *ShortLinkService) generateShortCode() (string, error) {
	length := config.AppConfig.ShortCodeLength
	b := make([]byte, length)
	for i := range b {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			return "", err
		}
		b[i] = charset[num.Int64()]
	}
	return string(b), nil
}

func (s *ShortLinkService) validateCustomCode(code string) error {
	if len(code) < 6 || len(code) > 10 {
		return errors.New("short code must be 6-10 characters")
	}
	for _, c := range code {
		if !((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')) {
			return errors.New("short code can only contain alphanumeric characters")
		}
	}
	return nil
}

func (s *ShortLinkService) CreateShortLink(originalURL, customCode string) (*model.ShortLink, error) {
	var code string
	var err error

	if customCode != "" {
		if err := s.validateCustomCode(customCode); err != nil {
			return nil, err
		}
		exists, err := s.repo.Exists(customCode)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, errors.New("short code already exists")
		}
		code = customCode
	} else {
		for {
			code, err = s.generateShortCode()
			if err != nil {
				return nil, err
			}
			exists, err := s.repo.Exists(code)
			if err != nil {
				return nil, err
			}
			if !exists {
				break
			}
		}
	}

	link := &model.ShortLink{
		ShortCode:   code,
		OriginalURL: originalURL,
	}

	err = s.repo.Create(link)
	if err != nil {
		return nil, err
	}

	redis.Client.Set(redis.Ctx, "shortlink:"+code, originalURL, 0)

	return link, nil
}

func (s *ShortLinkService) GetOriginalURL(code string) (string, error) {
	cachedURL, err := redis.Client.Get(redis.Ctx, "shortlink:"+code).Result()
	if err == nil {
		return cachedURL, nil
	}

	link, err := s.repo.GetByCode(code)
	if err != nil {
		return "", err
	}

	redis.Client.Set(redis.Ctx, "shortlink:"+code, link.OriginalURL, 0)

	return link.OriginalURL, nil
}

func (s *ShortLinkService) LogAccess(code, ip, userAgent string) error {
	log := &model.AccessLog{
		ShortCode: code,
		IP:        ip,
		UserAgent: userAgent,
		AccessedAt: time.Now(),
	}
	return s.logRepo.Create(log)
}

func (s *ShortLinkService) UpdateShortLink(code, newURL string) error {
	link, err := s.repo.GetByCode(code)
	if err != nil {
		return err
	}

	link.OriginalURL = newURL
	err = s.repo.Update(link)
	if err != nil {
		return err
	}

	redis.Client.Set(redis.Ctx, "shortlink:"+code, newURL, 0)
	return nil
}

func (s *ShortLinkService) DeleteShortLink(code string) error {
	err := s.repo.Delete(code)
	if err != nil {
		return err
	}
	redis.Client.Del(redis.Ctx, "shortlink:"+code)
	return nil
}

func (s *ShortLinkService) GetStats(code string) (*model.ShortLinkStats, error) {
	exists, err := s.repo.Exists(code)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, errors.New("short link not found")
	}

	totalVisits, err := s.logRepo.CountVisits(code)
	if err != nil {
		return nil, err
	}

	uniqueIPs, err := s.logRepo.CountUniqueIPs(code)
	if err != nil {
		return nil, err
	}

	trend, err := s.logRepo.GetLast24hTrend(code)
	if err != nil {
		return nil, err
	}

	return &model.ShortLinkStats{
		ShortCode:    code,
		TotalVisits:  totalVisits,
		UniqueIPs:    uniqueIPs,
		Last24hTrend: trend,
	}, nil
}

func (s *ShortLinkService) CleanOldLogs() error {
	return s.logRepo.CleanOldLogs(config.AppConfig.LogRetentionDays)
}
