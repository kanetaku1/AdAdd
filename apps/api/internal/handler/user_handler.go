package handler

import (
	"encoding/csv"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/kanetaku1/AdAdd/apps/api/internal/model"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"github.com/kanetaku1/AdAdd/apps/api/internal/service"
	"github.com/labstack/echo/v4"
)

func RegisterUserRoutes(e *echo.Echo) {
	r := e.Group("")
	r.GET("/users/me", getCurrentUser)

	admin := e.Group("/users", RequireRoles("ADMINISTRATOR"))
	admin.GET("", listUsers)
	admin.POST("", createUser)
	admin.POST("/bulk", bulkImportUsers)
	admin.PATCH("/:id", updateUser)
}

func getCurrentUser(c echo.Context) error {
	uid := c.Get("userId")
	if uid == nil || uid == "" {
		return respondUnauthorized(c, "unauthenticated")
	}
	userId := uid.(string)
	repo := repository.NewUserRepository()
	u, err := repo.GetByID(userId)
	if err != nil {
		return respondNotFound(c, "user not found")
	}
	roleSvc := service.NewRoleService()
	roles, err := roleSvc.ListCodesByUserID(u.ID)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	if roles == nil {
		roles = []string{}
	}
	resp := model.UserResponse{User: *u, Roles: roles}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": resp, "message": "success"})
}

func listUsers(c echo.Context) error {
	svc := service.NewUserService()
	users, err := svc.ListAll()
	if err != nil {
		return respondInternalServerError(c, err)
	}
	ids := make([]string, len(users))
	for i, u := range users {
		ids[i] = u.ID
	}
	roleSvc := service.NewRoleService()
	roleMap, err := roleSvc.ListCodesByUserIDs(ids)
	if err != nil {
		return respondInternalServerError(c, err)
	}
	resp := make([]model.UserResponse, len(users))
	for i, u := range users {
		roles := roleMap[u.ID]
		if roles == nil {
			roles = []string{}
		}
		resp[i] = model.UserResponse{User: u, Roles: roles}
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": resp, "message": "success"})
}

func createUser(c echo.Context) error {
	var user model.User
	if err := c.Bind(&user); err != nil {
		return respondBadRequest(c, "invalid request body")
	}

	svc := service.NewUserService()
	if err := svc.Create(&user); err != nil {
		if errors.Is(err, service.ErrEmailAlreadyExists) {
			return respondConflict(c, err.Error())
		}
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusCreated, map[string]interface{}{"data": user, "message": "success"})
}

func updateUser(c echo.Context) error {
	id := c.Param("id")
	var req service.UserUpdateOpts
	if err := c.Bind(&req); err != nil {
		return respondBadRequest(c, "invalid request body")
	}

	svc := service.NewUserService()
	user, err := svc.Update(id, req)
	if err != nil {
		if errors.Is(err, service.ErrEmailAlreadyExists) {
			return respondConflict(c, err.Error())
		}
		return respondInternalServerError(c, err)
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": user, "message": "success"})
}

func bulkImportUsers(c echo.Context) error {
	dryRun := c.FormValue("dryRun") == "true"

	fileHeader, err := c.FormFile("file")
	if err != nil {
		return respondBadRequest(c, "missing csv file key 'file'")
	}
	file, err := fileHeader.Open()
	if err != nil {
		return respondInternalServerError(c, err)
	}
	defer file.Close()

	// Handle optional UTF-8 BOM
	buf := make([]byte, 3)
	n, _ := io.ReadFull(file, buf)
	if n == 3 && buf[0] == 0xef && buf[1] == 0xbb && buf[2] == 0xbf {
		// BOM detected, skipped
	} else {
		// No BOM, reset
		file.Seek(0, 0)
	}

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return respondBadRequest(c, "invalid csv formatting")
	}
	if len(records) < 2 {
		return respondBadRequest(c, "csv must contain header and rows")
	}

	headers := records[0]
	headerMap := make(map[string]int)
	for i, h := range headers {
		headerMap[strings.TrimSpace(h)] = i
	}

	var rows []service.UserCsvRow
	for i, record := range records[1:] {
		rowNumber := i + 2 // 1 for header offset, 1 for 1-based index

		getVal := func(header string) string {
			idx, ok := headerMap[header]
			if !ok || idx >= len(record) {
				return ""
			}
			return strings.TrimSpace(record[idx])
		}

		rolesStr := getVal("roles")
		var roles []string
		for _, r := range strings.Split(rolesStr, ",") {
			r = strings.TrimSpace(r)
			if r != "" {
				roles = append(roles, r)
			}
		}

		rows = append(rows, service.UserCsvRow{
			RowNumber: rowNumber,
			StudentID: getVal("studentId"),
			Name:      getVal("name"),
			Email:     getVal("email"),
			SlackID:   getVal("slackId"),
			Roles:     roles,
		})
	}

	svc := service.NewUserService()
	result, err := svc.BulkImport(rows, dryRun)
	if err != nil {
		return respondInternalServerError(c, err)
	}

	msg := "Import successful"
	if dryRun {
		msg = "Preview successful"
	}
	return c.JSON(http.StatusOK, map[string]interface{}{"data": result, "message": msg})
}
