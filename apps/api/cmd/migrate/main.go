// Command migrate shows and applies database migrations explicitly, as one
// step of the production upgrade (spec/operations.md#Upgrading Production).
//
//	go run ./cmd/migrate status
//	go run ./cmd/migrate up -database <DB_NAME>
//
// The database comes from the same settings as the API (DB_* in .env or the
// environment). `up` applies only when -database names that same database,
// so a misconfigured environment cannot change another one.
package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/kanetaku1/AdAdd/apps/api/internal/config"
	"github.com/kanetaku1/AdAdd/apps/api/internal/db"
)

const usage = `usage:
  migrate status                    show the applied version and pending migrations
  migrate up -database <DB_NAME>    apply pending migrations to DB_NAME

Take a backup before "up" (spec/operations.md#Upgrading Production).`

func main() {
	log.SetFlags(0)
	if len(os.Args) < 2 {
		log.Fatal(usage)
	}
	cfg := config.Load()

	switch os.Args[1] {
	case "status":
		status := mustStatus(cfg)
		printStatus(cfg, status)
		if status.Dirty || status.Unknown {
			os.Exit(1)
		}
	case "up":
		flags := flag.NewFlagSet("up", flag.ExitOnError)
		database := flags.String("database", "", "name of the database to change; must equal DB_NAME")
		flags.Parse(os.Args[2:])
		if *database == "" || *database != cfg.DBName {
			log.Fatalf("refusing to apply: -database %q does not match DB_NAME %q", *database, cfg.DBName)
		}

		before := mustStatus(cfg)
		printStatus(cfg, before)
		if before.Dirty || before.Unknown {
			log.Fatal("refusing to apply: fix the state above first")
		}
		if len(before.Pending) == 0 {
			fmt.Println("nothing to apply")
			return
		}
		if err := db.ApplyMigrations(cfg); err != nil {
			log.Fatalf("%v\nThe database may be half-changed. Restore the backup taken before this step (spec/operations.md#Upgrading Production).", err)
		}
		printStatus(cfg, mustStatus(cfg))
	default:
		log.Fatal(usage)
	}
}

func mustStatus(cfg *config.Config) *db.MigrationStatus {
	status, err := db.GetMigrationStatus(cfg)
	if err != nil {
		log.Fatal(err)
	}
	return status
}

func printStatus(cfg *config.Config, status *db.MigrationStatus) {
	fmt.Printf("database: %s@%s:%s\n", cfg.DBName, cfg.DBHost, cfg.DBPort)
	fmt.Printf("applied:  %04d\n", status.Version)
	switch {
	case status.Dirty:
		fmt.Printf("state:    DIRTY — migration %04d failed partway. Restore the backup; do not edit schema_migrations (spec/operations.md#Upgrading Production).\n", status.Version)
	case status.Unknown:
		fmt.Printf("state:    UNKNOWN — version %04d has no migration file (spec/development.md#Baseline).\n", status.Version)
	default:
		fmt.Println("state:    clean")
	}
	if len(status.Pending) == 0 {
		fmt.Println("pending:  none")
		return
	}
	fmt.Print("pending: ")
	for _, v := range status.Pending {
		fmt.Printf(" %04d", v)
	}
	fmt.Println()
}
