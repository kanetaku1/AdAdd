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

// A method and path registered in two Role groups is resolved by registration
// order, so the effective Role check depends on which group came last.
func TestRoutesAreRegisteredOnce(t *testing.T) {
	// e.Routes() keeps only the last registration per method and path, so
	// duplicates are observed as they are added.
	seen := make(map[string]bool)
	e := echo.New()
	e.OnAddRouteHandler = func(_ string, route echo.Route, _ echo.HandlerFunc, _ []echo.MiddlewareFunc) {
		if route.Method == echo.RouteNotFound {
			return // added by every Group.Use, not an API route
		}
		key := route.Method + " " + route.Path
		if seen[key] {
			t.Errorf("%s is registered more than once", key)
		}
		seen[key] = true
	}
	RegisterHealthRoutes(e)
	RegisterRoutes(e)
}
