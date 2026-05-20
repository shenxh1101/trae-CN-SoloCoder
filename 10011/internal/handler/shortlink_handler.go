package handler

import (
	"net/http"
	"shortlink/internal/service"
	"strings"

	"github.com/gin-gonic/gin"
)

type ShortLinkHandler struct {
	service *service.ShortLinkService
}

func NewShortLinkHandler() *ShortLinkHandler {
	return &ShortLinkHandler{
		service: service.NewShortLinkService(),
	}
}

type CreateRequest struct {
	URL        string `json:"url" binding:"required"`
	CustomCode string `json:"custom_code,omitempty"`
}

type UpdateRequest struct {
	URL string `json:"url" binding:"required"`
}

func (h *ShortLinkHandler) CreateShortLink(c *gin.Context) {
	var req CreateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if !strings.HasPrefix(req.URL, "http://") && !strings.HasPrefix(req.URL, "https://") {
		req.URL = "https://" + req.URL
	}

	link, err := h.service.CreateShortLink(req.URL, req.CustomCode)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"short_code":  link.ShortCode,
		"original_url": link.OriginalURL,
		"short_url":   c.Request.Host + "/" + link.ShortCode,
	})
}

func (h *ShortLinkHandler) Redirect(c *gin.Context) {
	code := c.Param("code")
	if code == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "Short code not found"})
		return
	}

	originalURL, err := h.service.GetOriginalURL(code)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Short link not found"})
		return
	}

	ip := c.ClientIP()
	userAgent := c.Request.UserAgent()
	go h.service.LogAccess(code, ip, userAgent)

	c.Redirect(http.StatusMovedPermanently, originalURL)
}

func (h *ShortLinkHandler) UpdateShortLink(c *gin.Context) {
	code := c.Param("code")
	var req UpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if !strings.HasPrefix(req.URL, "http://") && !strings.HasPrefix(req.URL, "https://") {
		req.URL = "https://" + req.URL
	}

	err := h.service.UpdateShortLink(code, req.URL)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Short link not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Short link updated successfully"})
}

func (h *ShortLinkHandler) DeleteShortLink(c *gin.Context) {
	code := c.Param("code")

	err := h.service.DeleteShortLink(code)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Short link not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Short link deleted successfully"})
}

func (h *ShortLinkHandler) GetStats(c *gin.Context) {
	code := c.Param("code")

	stats, err := h.service.GetStats(code)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}
