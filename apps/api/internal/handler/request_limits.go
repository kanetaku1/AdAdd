package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"
)

const (
	defaultRequestBodyLimit int64 = 1 << 20
	uploadRequestBodyLimit  int64 = 50 << 20
)

func RequestBodyLimit(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		limit := defaultRequestBodyLimit
		if isFileUploadRequest(c.Request()) {
			limit = uploadRequestBodyLimit
		}
		if c.Request().ContentLength > limit {
			return respondPayloadTooLarge(c)
		}
		c.Request().Body = http.MaxBytesReader(c.Response(), c.Request().Body, limit)
		return next(c)
	}
}

func isFileUploadRequest(request *http.Request) bool {
	if request.Method != http.MethodPost {
		return false
	}
	path := request.URL.Path
	if path == "/companies/bulk" || path == "/users/bulk" {
		return true
	}
	segments := strings.Split(strings.Trim(path, "/"), "/")
	return len(segments) == 3 &&
		segments[0] == "contract-menus" &&
		segments[1] != "" &&
		segments[2] == "drive-upload"
}

func respondRequestBodyError(c echo.Context, err error, message string) error {
	var maxBytesError *http.MaxBytesError
	if errors.Is(err, echo.ErrStatusRequestEntityTooLarge) || errors.As(err, &maxBytesError) {
		return respondPayloadTooLarge(c)
	}
	return respondBadRequest(c, message)
}

func respondPayloadTooLarge(c echo.Context) error {
	return respondError(c, http.StatusRequestEntityTooLarge, ErrCodeInvalidRequest, "request body exceeds the allowed size")
}
