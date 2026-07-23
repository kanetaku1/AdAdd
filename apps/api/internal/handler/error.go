package handler

import (
	"errors"
	"log"
	"net/http"

	"github.com/go-sql-driver/mysql"
	"github.com/labstack/echo/v4"
)

type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

const (
	ErrCodeInvalidRequest = "INVALID_REQUEST"
	ErrCodeNotFound       = "NOT_FOUND"
	ErrCodeConflict       = "CONFLICT"
	ErrCodeInternal       = "INTERNAL_ERROR"
	ErrCodeUnauthorized   = "UNAUTHORIZED"
)

// respondError is a generic helper to send standardized error responses
func respondError(c echo.Context, status int, code, message string) error {
	return c.JSON(status, ErrorResponse{
		Error: ErrorDetail{
			Code:    code,
			Message: message,
		},
	})
}

// respondBadRequest shortcuts HTTP 400 errors
func respondBadRequest(c echo.Context, message string) error {
	return respondError(c, http.StatusBadRequest, ErrCodeInvalidRequest, message)
}

// respondNotFound shortcuts HTTP 404 errors
func respondNotFound(c echo.Context, message string) error {
	return respondError(c, http.StatusNotFound, ErrCodeNotFound, message)
}

// respondConflict shortcuts HTTP 409 errors
func respondConflict(c echo.Context, message string) error {
	return respondError(c, http.StatusConflict, ErrCodeConflict, message)
}

// respondUnauthorized shortcuts HTTP 401 errors
func respondUnauthorized(c echo.Context, message string) error {
	return respondError(c, http.StatusUnauthorized, ErrCodeUnauthorized, message)
}

// respondInternalServerError parses the error. If it's a MySQL unique constraint violation (1062),
// it returns a 409 Conflict. Otherwise it hides details and returns a generic 500 error.
func respondInternalServerError(c echo.Context, err error) error {
	var mysqlErr *mysql.MySQLError
	if errors.As(err, &mysqlErr) {
		if mysqlErr.Number == 1062 {
			// Duplicate entry
			return respondConflict(c, "a conflict occurred due to duplicate unique values")
		}
	}

	// For genuine internal errors, log it, but don't leak details to the client
	log.Printf("Internal Server Error: %v", err)
	return respondError(c, http.StatusInternalServerError, ErrCodeInternal, "an unexpected internal error occurred")
}
