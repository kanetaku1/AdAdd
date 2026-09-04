package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv         string
	AllowedOrigins []string
	AppPort        string
	DBHost         string
	DBPort         string
	DBUser         string
	DBPassword     string
	DBName         string
	MigrateOnStart bool
	MigrationsPath string
	DevAuthEnabled bool
	GoogleClientID string
	JWTSecret      string
	SlackBotToken  string
	SlackChannelID string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, using environment variables")
	}

	migrateOnStart := false
	if getEnv("MIGRATE_ON_START", "false") == "true" {
		migrateOnStart = true
	}

	appEnv := getEnv("APP_ENV", "development")

	var allowedOrigins []string
	if originsStr := getEnv("ALLOWED_ORIGINS", ""); originsStr != "" {
		for _, o := range strings.Split(originsStr, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				allowedOrigins = append(allowedOrigins, o)
			}
		}
	}
	if appEnv == "development" {
		allowedOrigins = append(allowedOrigins, "http://localhost:3000", "http://localhost:3001")
	}

	// DEV_AUTH_ENABLED gates the X-User-ID/X-User-Roles dev stub
	// (spec/api.md#Authentication). Forced off outside development
	// regardless of the env var, so a misconfiguration can't open the
	// bypass in production.
	devAuthEnabled := appEnv == "development" && getEnv("DEV_AUTH_ENABLED", "false") == "true"

	return &Config{
		AppEnv:         appEnv,
		AllowedOrigins: allowedOrigins,
		AppPort:        getEnv("APP_PORT", "8080"),
		DBHost:         getEnv("DB_HOST", "127.0.0.1"),
		DBPort:         getEnv("DB_PORT", "3306"),
		DBUser:         getEnv("DB_USER", "root"),
		DBPassword:     getEnv("DB_PASSWORD", ""),
		DBName:         getEnv("DB_NAME", "adadd"),
		MigrateOnStart: migrateOnStart,
		MigrationsPath: getEnv("MIGRATIONS_PATH", "./migrations"),
		DevAuthEnabled: devAuthEnabled,
		GoogleClientID: getEnv("GOOGLE_CLIENT_ID", ""),
		JWTSecret:      getEnv("JWT_SECRET", ""),
		SlackBotToken:  getEnv("SLACK_BOT_TOKEN", ""),
		SlackChannelID: getEnv("SLACK_CHANNEL_ID", ""),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
