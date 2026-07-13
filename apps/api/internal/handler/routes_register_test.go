package handler

import (
	"testing"

	"github.com/labstack/echo/v4"
)

func TestRegisterRoutesDoesNotPanic(t *testing.T) {
	e := echo.New()
	// simply ensure registration runs without panic
	RegisterRoutes(e)
}
