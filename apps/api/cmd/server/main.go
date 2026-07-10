package main

import (
	"log"

	"github.com/labstack/echo/v4"

	"github.com/kanetaku1/AdAdd/apps/api/internal/config"
	"github.com/kanetaku1/AdAdd/apps/api/internal/handler"
)

func main() {
	cfg := config.Load()

	e := echo.New()

	handler.RegisterHealthRoutes(e)

	log.Printf("starting server on port %s", cfg.AppPort)
	if err := e.Start(":" + cfg.AppPort); err != nil {
		log.Fatal(err)
	}
}
