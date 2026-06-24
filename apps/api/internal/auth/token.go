package auth

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func GenerateToken(userID, username, secret string) (string, error) {
	// Implementation for generating a JWT token using the userID, username and secret
	tk := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id":  userID,
		"username": username,
		"exp":      time.Now().Add(time.Hour * 72).Unix(),
	})
	tokenString, err := tk.SignedString([]byte(secret))
	if err != nil {
		return "", err
	}
	return tokenString, nil
}

func ValidateToken(tokenString, secret string) (string, error) {
	// Implementation for validating a JWT token and extracting the userID
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secret), nil
	})
	if err != nil {
		return "", err
	}
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		if val, ok := claims["user_id"].(string); ok {
			return val, nil
		}
		if val, ok := claims["userID"].(string); ok {
			return val, nil
		}
		return "", fmt.Errorf("userID claim is missing or not a string")
	}
	return "", nil
}