package middleware

import (
	"errors"
	"lottery-system/internal/config"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var jwtKey = []byte("lottery-secret-key-2024")

type Claims struct {
	UserID uint   `json:"user_id"`
	Phone  string `json:"phone"`
	jwt.RegisteredClaims
}

func GenerateToken(userID uint, phone string) (string, error) {
	if config.AppConfig != nil && config.AppConfig.JWTSecret != "" {
		jwtKey = []byte(config.AppConfig.JWTSecret)
	}

	expirationTime := time.Now().Add(7 * 24 * time.Hour)
	claims := &Claims{
		UserID: userID,
		Phone:  phone,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtKey)
}

func ParseToken(tokenString string) (uint, string, error) {
	if config.AppConfig != nil && config.AppConfig.JWTSecret != "" {
		jwtKey = []byte(config.AppConfig.JWTSecret)
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})

	if err != nil {
		return 0, "", err
	}

	if !token.Valid {
		return 0, "", errors.New("invalid token")
	}

	return claims.UserID, claims.Phone, nil
}
