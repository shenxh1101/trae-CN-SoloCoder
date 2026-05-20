package handlers

import (
	"math/rand"
	"net/http"
	"strconv"
	"time"

	"lottery-system/internal/middleware"
	"lottery-system/internal/models"
	"lottery-system/pkg/database"
	"lottery-system/pkg/redis"

	"github.com/gin-gonic/gin"
)

type LoginRequest struct {
	Phone string `json:"phone" binding:"required"`
	Code  string `json:"code" binding:"required"`
}

func SendCode(c *gin.Context) {
	var req struct {
		Phone string `json:"phone" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "手机号不能为空"})
		return
	}

	code := generateCode()

	var smsCode models.SMSCode
	database.DB.Where("phone = ?", req.Phone).First(&smsCode)
	if smsCode.ID > 0 {
		smsCode.Code = code
		smsCode.ExpiresAt = time.Now().Add(5 * time.Minute)
		database.DB.Save(&smsCode)
	} else {
		database.DB.Create(&models.SMSCode{
			Phone:     req.Phone,
			Code:      code,
			ExpiresAt: time.Now().Add(5 * time.Minute),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "验证码发送成功",
		"code":    code,
	})
}

func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "参数错误"})
		return
	}

	var smsCode models.SMSCode
	result := database.DB.Where("phone = ? AND code = ?", req.Phone, req.Code).First(&smsCode)
	if result.Error != nil || time.Now().After(smsCode.ExpiresAt) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "验证码错误或已过期"})
		return
	}

	var user models.User
	result = database.DB.Where("phone = ?", req.Phone).First(&user)
	if result.Error != nil {
		user = models.User{Phone: req.Phone}
		database.DB.Create(&user)
	}

	token, err := middleware.GenerateToken(user.ID, user.Phone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "生成token失败"})
		return
	}

	database.DB.Delete(&smsCode)

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":    user.ID,
			"phone": user.Phone,
		},
	})
}

func GetProfile(c *gin.Context) {
	userID := c.GetUint("userID")
	phone := c.GetString("phone")

	today := time.Now().Format("2006-01-02")
	drawCount, _ := redis.GetUserDrawCount(userID, today)

	c.JSON(http.StatusOK, gin.H{
		"id":            userID,
		"phone":         phone,
		"draw_count":    drawCount,
		"max_draw":      3,
		"remain_draw":   3 - drawCount,
	})
}

func GetPrizes(c *gin.Context) {
	var prizes []models.Prize
	database.DB.Where("is_enabled = ?", true).Order("sort_order ASC").Find(&prizes)

	c.JSON(http.StatusOK, prizes)
}

func GetRecentRecords(c *gin.Context) {
	records, err := redis.GetRecentRecords()
	if err != nil {
		var dbRecords []models.Record
		database.DB.Where("is_win = ?", true).Order("created_at DESC").Limit(20).Find(&dbRecords)

		result := make([]map[string]interface{}, len(dbRecords))
		for i, r := range dbRecords {
			result[i] = map[string]interface{}{
				"phone":     maskPhone(r.UserPhone),
				"prizeName": r.PrizeName,
				"time":      r.CreatedAt.Format("2006-01-02 15:04:05"),
			}
		}
		c.JSON(http.StatusOK, result)
		return
	}

	result := make([]map[string]interface{}, 0, len(records))
	for _, r := range records {
		result = append(result, map[string]interface{}{
			"content": r,
		})
	}

	c.JSON(http.StatusOK, result)
}

func GetMyRecords(c *gin.Context) {
	userID := c.GetUint("userID")

	var records []models.Record
	database.DB.Where("user_id = ?", userID).Order("created_at DESC").Limit(50).Find(&records)

	c.JSON(http.StatusOK, records)
}

func generateCode() string {
	return strconv.Itoa(100000 + rand.Intn(900000))
}

func maskPhone(phone string) string {
	if len(phone) < 7 {
		return phone
	}
	return phone[:3] + "****" + phone[len(phone)-4:]
}
