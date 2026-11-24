package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv                  string
	AllowedOrigins          []string
	AppPort                 string
	DBHost                  string
	DBPort                  string
	DBUser                  string
	DBPassword              string
	DBName                  string
	MigrateOnStart          bool
	MigrationsPath          string
	GoogleClientID          string
	GoogleDriveClientID     string
	GoogleDriveClientSecret string
	GoogleDriveRefreshToken string
	GoogleDriveAccountEmail  string
	GoogleDriveRootFolderID  string
	JWTSecret                string
	SlackBotToken           string
	SlackChannelID          string
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

	return &Config{
		AppEnv:                  appEnv,
		AllowedOrigins:          allowedOrigins,
		AppPort:                 getEnv("APP_PORT", "8080"),
		DBHost:                  getEnv("DB_HOST", "127.0.0.1"),
		DBPort:                  getEnv("DB_PORT", "3306"),
		DBUser:                  getEnv("DB_USER", "root"),
		DBPassword:              getEnv("DB_PASSWORD", ""),
		DBName:                  getEnv("DB_NAME", "adadd"),
		MigrateOnStart:          migrateOnStart,
		MigrationsPath:          getEnv("MIGRATIONS_PATH", "./migrations"),
		GoogleClientID:          getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleDriveClientID:     getEnv("GOOGLE_DRIVE_CLIENT_ID", ""),
		GoogleDriveClientSecret: getEnv("GOOGLE_DRIVE_CLIENT_SECRET", ""),
		GoogleDriveRefreshToken: getEnv("GOOGLE_DRIVE_REFRESH_TOKEN", ""),
		GoogleDriveAccountEmail: getEnv("GOOGLE_DRIVE_ACCOUNT_EMAIL", ""),
		GoogleDriveRootFolderID: getEnv("GOOGLE_DRIVE_ROOT_FOLDER_ID", ""),
		JWTSecret:               getEnv("JWT_SECRET", ""),
		SlackBotToken:           getEnv("SLACK_BOT_TOKEN", ""),
		SlackChannelID:          getEnv("SLACK_CHANNEL_ID", ""),
	}
}

func countNonEmpty(values ...string) int {
	n := 0
	for _, v := range values {
		if v != "" {
			n++
		}
	}
	return n
}

// Validate checks that required environment variables are set and that
// variable groups are configured consistently. Call it from cmd/server
// after Load(). cmd/drive-auth skips it because it does not need JWT_SECRET
// or the full Drive triple.
func (c *Config) Validate() {
	if c.JWTSecret == "" {
		log.Fatal("JWT_SECRET must be set (see .env.example)")
	}

	if c.GoogleClientID == "" {
		log.Println("WARNING: GOOGLE_CLIENT_ID not set, POST /auth/google will be unavailable")
	}

	driveVarsSet := countNonEmpty(c.GoogleDriveClientID, c.GoogleDriveClientSecret, c.GoogleDriveRefreshToken)
	if driveVarsSet != 0 && driveVarsSet != 3 {
		log.Fatal("GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, and GOOGLE_DRIVE_REFRESH_TOKEN must all be set together or all be empty")
	}

	slackVarsSet := countNonEmpty(c.SlackBotToken, c.SlackChannelID)
	if slackVarsSet == 1 {
		log.Fatal("SLACK_BOT_TOKEN and SLACK_CHANNEL_ID must both be set or both be empty")
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
