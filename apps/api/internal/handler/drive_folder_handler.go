package handler

import (
	"context"
	"errors"
	"log"
	"net/http"

	"github.com/kanetaku1/AdAdd/apps/api/internal/config"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
)

type DriveFolderOperator interface {
	ListFolders(ctx context.Context, parentID, rootFolderID string) (*service.DriveFolderListing, error)
}

var newDriveFolderOperator = func() DriveFolderOperator {
	return service.NewDriveService()
}

func RegisterDriveFolderRoutes(e *echo.Echo) {
	r := e.Group("")
	r.Use(RequireRoles("SPONSORSHIP_MEMBER", "ADVISOR", "ADVERTISEMENT_MANAGER", "ADMINISTRATOR"))
	r.GET("/drive/folders", listDriveFolders)
}

func listDriveFolders(c echo.Context) error {
	parentID := c.QueryParam("parent")

	cfg := config.Load()
	rootFolderID := cfg.GoogleDriveRootFolderID
	if rootFolderID == "" {
		return c.JSON(http.StatusServiceUnavailable, map[string]string{
			"error": "Drive integration is not configured",
		})
	}

	drv := newDriveFolderOperator()
	listing, err := drv.ListFolders(c.Request().Context(), parentID, rootFolderID)
	if err != nil {
		if errors.Is(err, service.ErrDriveNotConfigured) {
			return c.JSON(http.StatusServiceUnavailable, map[string]string{
				"error": "Drive integration is not configured",
			})
		}
		if errors.Is(err, service.ErrDriveFolderNotFound) {
			return c.JSON(http.StatusNotFound, map[string]string{
				"error": "folder not found or is not a folder",
			})
		}
		if errors.Is(err, service.ErrDriveFolderOutsideRoot) {
			return c.JSON(http.StatusBadRequest, map[string]string{
				"error": "folder is outside the root folder",
			})
		}
		log.Printf("GET /drive/folders: Drive API error: %v", err)
		return c.JSON(http.StatusBadGateway, map[string]string{
			"error": "Drive API error",
		})
	}

	return c.JSON(http.StatusOK, listing)
}
