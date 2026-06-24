package config

import (
	"fmt"
	"os"
)

// Config holds all environment variables.
// Fatal on startup if required fields are missing.
type Config struct {
	Port               string
	DatabaseURL        string
	RedisURL           string
	JWTSecret          string
	TMDBAPIKey         string
	WatchmodeAPIKey    string
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	AllowedOrigins     string
	AppURL             string
}

func Load() (*Config, error) {
	cfg := &Config{
		Port:               getEnv("PORT", "8080"),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		RedisURL:           getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:          os.Getenv("JWT_SECRET"),
		TMDBAPIKey:         os.Getenv("TMDB_API_KEY"),
		WatchmodeAPIKey:    os.Getenv("WATCHMODE_API_KEY"),
		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/v1/auth/google/callback"),
		AllowedOrigins:     getEnv("ALLOWED_ORIGINS", "http://localhost:3001"),
		AppURL:             getEnv("APP_URL", "http://localhost:3000"),
	}

	// Required field validation
	required := map[string]string{
		"DATABASE_URL": cfg.DatabaseURL,
		"JWT_SECRET":   cfg.JWTSecret,
	}
	for k, v := range required {
		if v == "" {
			return nil, fmt.Errorf("required env var %s is not set", k)
		}
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
