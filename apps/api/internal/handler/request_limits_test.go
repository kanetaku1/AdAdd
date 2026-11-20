package handler

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"
)

func TestRequestBodyLimitUsesUploadAllowanceOnlyForFileEndpoints(t *testing.T) {
	tests := []struct {
		name        string
		method      string
		path        string
		contentSize int64
		wantStatus  int
	}{
		{"normal request over limit", http.MethodPost, "/companies", defaultRequestBodyLimit + 1, http.StatusRequestEntityTooLarge},
		{"company CSV uses upload limit", http.MethodPost, "/companies/bulk", defaultRequestBodyLimit + 1, http.StatusNoContent},
		{"company CSV over upload limit", http.MethodPost, "/companies/bulk", uploadRequestBodyLimit + 1, http.StatusRequestEntityTooLarge},
		{"user CSV over upload limit", http.MethodPost, "/users/bulk", uploadRequestBodyLimit + 1, http.StatusRequestEntityTooLarge},
		{"Drive upload over upload limit", http.MethodPost, "/contract-menus/menu-id/drive-upload", uploadRequestBodyLimit + 1, http.StatusRequestEntityTooLarge},
		{"other Contract Menu request is normal", http.MethodPost, "/contract-menus/menu-id/production/files", defaultRequestBodyLimit + 1, http.StatusRequestEntityTooLarge},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			e := echo.New()
			e.Use(RequestBodyLimit)
			e.Any(test.path, func(c echo.Context) error {
				_, err := io.ReadAll(c.Request().Body)
				if err != nil {
					return respondRequestBodyError(c, err, "invalid request body")
				}
				return c.NoContent(http.StatusNoContent)
			})

			request := httptest.NewRequest(test.method, test.path, strings.NewReader(""))
			request.ContentLength = test.contentSize
			response := httptest.NewRecorder()
			e.ServeHTTP(response, request)
			if response.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d", response.Code, test.wantStatus)
			}
			if test.wantStatus == http.StatusRequestEntityTooLarge &&
				!strings.Contains(response.Body.String(), "request body exceeds the allowed size") {
				t.Fatalf("response does not contain generic size error: %s", response.Body.String())
			}
		})
	}
}

func TestRequestBodyLimitRejectsChunkedOversizeRequest(t *testing.T) {
	e := echo.New()
	e.POST("/companies", func(c echo.Context) error {
		_, err := io.ReadAll(c.Request().Body)
		if err != nil {
			return respondRequestBodyError(c, err, "invalid request body")
		}
		return c.NoContent(http.StatusNoContent)
	}, RequestBodyLimit)

	request := httptest.NewRequest(http.MethodPost, "/companies", strings.NewReader(strings.Repeat("x", int(defaultRequestBodyLimit+1))))
	request.ContentLength = -1
	response := httptest.NewRecorder()
	e.ServeHTTP(response, request)
	if response.Code != http.StatusRequestEntityTooLarge {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusRequestEntityTooLarge)
	}
}

func TestRequestBodyErrorDoesNotExposeParserDetails(t *testing.T) {
	e := echo.New()
	e.POST("/", func(c echo.Context) error {
		return respondRequestBodyError(c, echo.NewHTTPError(http.StatusBadRequest, "internal parser detail"), "invalid request body")
	})
	response := httptest.NewRecorder()
	e.ServeHTTP(response, httptest.NewRequest(http.MethodPost, "/", strings.NewReader("{}")))
	if response.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusBadRequest)
	}
	if strings.Contains(response.Body.String(), "internal parser detail") {
		t.Fatalf("parser detail leaked in response: %s", response.Body.String())
	}
}
