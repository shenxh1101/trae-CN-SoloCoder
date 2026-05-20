package repository

import (
	"shortlink/internal/model"
	"shortlink/pkg/sqlite"
)

type ShortLinkRepository struct{}

func NewShortLinkRepository() *ShortLinkRepository {
	return &ShortLinkRepository{}
}

func (r *ShortLinkRepository) Create(link *model.ShortLink) error {
	return sqlite.DB.Create(link).Error
}

func (r *ShortLinkRepository) GetByCode(code string) (*model.ShortLink, error) {
	var link model.ShortLink
	err := sqlite.DB.Where("short_code = ?", code).First(&link).Error
	if err != nil {
		return nil, err
	}
	return &link, nil
}

func (r *ShortLinkRepository) Exists(code string) (bool, error) {
	var count int64
	err := sqlite.DB.Model(&model.ShortLink{}).Where("short_code = ?", code).Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *ShortLinkRepository) Update(link *model.ShortLink) error {
	return sqlite.DB.Save(link).Error
}

func (r *ShortLinkRepository) Delete(code string) error {
	return sqlite.DB.Where("short_code = ?", code).Delete(&model.ShortLink{}).Error
}
