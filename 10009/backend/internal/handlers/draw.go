package handlers

import (
	"encoding/json"
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"lottery-system/internal/models"
	"lottery-system/pkg/database"
	"lottery-system/pkg/redis"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const MaxDrawPerDay = 3

func Draw(c *gin.Context) {
	userID := c.GetUint("userID")
	phone := c.GetString("phone")

	today := time.Now().Format("2006-01-02")

	drawCount, err := redis.GetUserDrawCount(userID, today)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取抽奖次数失败"})
		return
	}

	if drawCount >= MaxDrawPerDay {
		c.JSON(http.StatusBadRequest, gin.H{"error": "今天抽奖次数已用完"})
		return
	}

	lockKey := fmt.Sprintf("draw_lock:%d", userID)
	locked, err := redis.Lock(lockKey, 5*time.Second)
	if err != nil || !locked {
		c.JSON(http.StatusTooManyRequests, gin.H{"error": "操作太频繁，请稍后再试"})
		return
	}
	defer redis.Unlock(lockKey)

	drawCount, _ = redis.GetUserDrawCount(userID, today)
	if drawCount >= MaxDrawPerDay {
		c.JSON(http.StatusBadRequest, gin.H{"error": "今天抽奖次数已用完"})
		return
	}

	prize, err := doDraw()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	err = database.DB.Transaction(func(tx *gorm.DB) error {
		if prize.ID > 0 && prize.Name != "谢谢参与" {
			result := tx.Model(&models.Prize{}).
				Where("id = ? AND stock > 0", prize.ID).
				Update("stock", gorm.Expr("stock - 1"))
			if result.Error != nil {
				return result.Error
			}
			if result.RowsAffected == 0 {
				return fmt.Errorf("奖品库存不足")
			}
		}

		isWin := prize.Name != "谢谢参与"
		record := models.Record{
			UserID:    userID,
			UserPhone: phone,
			PrizeID:   prize.ID,
			PrizeName: prize.Name,
			IsWin:     isWin,
		}
		if err := tx.Create(&record).Error; err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	redis.IncrementUserDrawCount(userID, today)

	if prize.Name != "谢谢参与" {
		recordMsg := fmt.Sprintf("%s 恭喜用户 %s 抽中 %s",
			time.Now().Format("15:04:05"),
			maskPhone(phone),
			prize.Name)
		redis.AddRecentRecord(recordMsg)
		go BroadcastWinRecord(recordMsg)
	}

	c.JSON(http.StatusOK, gin.H{
		"prize": prize,
		"is_win": prize.Name != "谢谢参与",
	})
}

func doDraw() (*models.Prize, error) {
	var prizes []models.Prize
	database.DB.Where("is_enabled = ? AND stock > 0", true).Order("sort_order ASC").Find(&prizes)

	if len(prizes) == 0 {
		return nil, fmt.Errorf("暂无可用奖品")
	}

	totalProb := 0.0
	for _, p := range prizes {
		totalProb += p.Probability
	}

	if totalProb == 0 {
		return nil, fmt.Errorf("奖品配置错误")
	}

	r := rand.Float64() * totalProb
	accum := 0.0

	for _, p := range prizes {
		accum += p.Probability
		if r <= accum {
			return &p, nil
		}
	}

	return &prizes[len(prizes)-1], nil
}

type PrizeRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description string  `json:"description"`
	ImageURL    string  `json:"image_url"`
	Stock       int     `json:"stock" binding:"min=0"`
	Probability float64 `json:"probability" binding:"min=0,max=1"`
	IsEnabled   bool    `json:"is_enabled"`
	SortOrder   int     `json:"sort_order"`
}

func AdminGetPrizes(c *gin.Context) {
	var prizes []models.Prize
	database.DB.Order("sort_order ASC").Find(&prizes)
	c.JSON(http.StatusOK, prizes)
}

func AdminCreatePrize(c *gin.Context) {
	var req PrizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	prize := models.Prize{
		Name:        req.Name,
		Description: req.Description,
		ImageURL:    req.ImageURL,
		Stock:       req.Stock,
		Probability: req.Probability,
		IsEnabled:   req.IsEnabled,
		SortOrder:   req.SortOrder,
	}

	if err := database.DB.Create(&prize).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, prize)
}

func AdminUpdatePrize(c *gin.Context) {
	id := c.Param("id")
	var req PrizeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var prize models.Prize
	if err := database.DB.First(&prize, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "奖品不存在"})
		return
	}

	prize.Name = req.Name
	prize.Description = req.Description
	prize.ImageURL = req.ImageURL
	prize.Stock = req.Stock
	prize.Probability = req.Probability
	prize.IsEnabled = req.IsEnabled
	prize.SortOrder = req.SortOrder

	if err := database.DB.Save(&prize).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, prize)
}

func AdminDeletePrize(c *gin.Context) {
	id := c.Param("id")
	if err := database.DB.Delete(&models.Prize{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "删除成功"})
}

func ValidateProbability(c *gin.Context) {
	var prizes []models.Prize
	database.DB.Where("is_enabled = ?", true).Find(&prizes)

	total := 0.0
	for _, p := range prizes {
		total += p.Probability
	}

	c.JSON(http.StatusOK, gin.H{
		"total":   total,
		"is_valid": total == 1.0,
		"prizes":  prizes,
	})
}

func AdminGetRecords(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	isWin := c.Query("is_win")
	phone := c.Query("phone")

	query := database.DB.Model(&models.Record{})
	if isWin != "" {
		query = query.Where("is_win = ?", isWin == "true")
	}
	if phone != "" {
		query = query.Where("user_phone LIKE ?", "%"+phone+"%")
	}

	var total int64
	query.Count(&total)

	var records []models.Record
	query.Offset((page - 1) * pageSize).Limit(pageSize).Order("created_at DESC").Find(&records)

	c.JSON(http.StatusOK, gin.H{
		"total": total,
		"list":  records,
		"page":  page,
		"size":  pageSize,
	})
}

func ExportRecords(c *gin.Context) {
	var records []models.Record
	database.DB.Where("is_win = ?", true).Order("created_at DESC").Find(&records)

	c.Header("Content-Type", "application/json; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=winners_%s.json", time.Now().Format("20060102150405")))

	type ExportRecord struct {
		ID        uint   `json:"id"`
		Phone     string `json:"phone"`
		PrizeName string `json:"prize_name"`
		WinTime   string `json:"win_time"`
	}

	exportData := make([]ExportRecord, len(records))
	for i, r := range records {
		exportData[i] = ExportRecord{
			ID:        r.ID,
			Phone:     r.UserPhone,
			PrizeName: r.PrizeName,
			WinTime:   r.CreatedAt.Format("2006-01-02 15:04:05"),
		}
	}

	jsonData, _ := json.MarshalIndent(exportData, "", "  ")
	c.String(http.StatusOK, string(jsonData))
}
