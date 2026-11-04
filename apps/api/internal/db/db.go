package db

import (
	"fmt"
	"log"
	"net"
	"time"

	gomysql "github.com/go-sql-driver/mysql"
	"github.com/kanetaku1/AdAdd/apps/api/internal/config"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var DB *gorm.DB

// Init connects to the database and assigns the global DB. It does NOT run AutoMigrate;
// migrations must be applied separately (Migration First policy).
func Init(cfg *config.Config) {
	connection := gomysql.NewConfig()
	connection.User = cfg.DBUser
	connection.Passwd = cfg.DBPassword
	connection.Net = "tcp"
	connection.Addr = net.JoinHostPort(cfg.DBHost, cfg.DBPort)
	connection.DBName = cfg.DBName
	ConfigureConnection(connection)

	db, err := gorm.Open(mysql.Open(connection.FormatDSN()), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	DB = db
	log.Println("database connection established")
}

// ConfigureConnection applies the settings every AdAdd connection uses.
// Timestamps are UTC on both sides (spec/architecture.md#Time Zone): Go
// writes and reads DATETIME as UTC (loc), and the session time_zone makes
// MySQL's CURRENT_TIMESTAMP defaults UTC as well — independent of the time
// zone of the machine running the API or of the MySQL server.
func ConfigureConnection(connection *gomysql.Config) {
	connection.ParseTime = true
	connection.Loc = time.UTC
	if connection.Params == nil {
		connection.Params = map[string]string{}
	}
	connection.Params["charset"] = "utf8mb4"
	connection.Params["time_zone"] = "'+00:00'"
}

// WithTx runs fn inside a database transaction and returns its error if any.
// This helper centralizes transaction handling so service-layer operations can
// perform multiple DB writes atomically without exposing *gorm.DB across all repositories.
func WithTx(fn func(tx *gorm.DB) error) error {
	if DB == nil {
		return fmt.Errorf("database not initialized")
	}
	return DB.Transaction(fn)
}
