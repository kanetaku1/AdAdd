package slack

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestClientEnabled(t *testing.T) {
	if NewClient("", "C1").Enabled() {
		t.Fatal("empty token should be disabled")
	}
	if NewClient("xoxb-x", "").Enabled() {
		t.Fatal("empty channel should be disabled")
	}
	if NewClient("", "").Enabled() {
		t.Fatal("empty token and channel should be disabled")
	}
	if !NewClient("xoxb-x", "C1").Enabled() {
		t.Fatal("token and channel should enable the client")
	}
}

func TestPostMessageNoOpWhenDisabled(t *testing.T) {
	c := NewClient("", "C1")
	if err := c.PostMessage(context.Background(), "hi"); err != nil {
		t.Fatalf("disabled client must not error: %v", err)
	}
}

func TestPostMessageSendsJSONAndBearer(t *testing.T) {
	var gotAuth string
	var gotBody postMessageRequest
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotAuth = r.Header.Get("Authorization")
		raw, _ := io.ReadAll(r.Body)
		if err := json.Unmarshal(raw, &gotBody); err != nil {
			t.Errorf("unmarshal: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":true}`))
	}))
	defer srv.Close()

	c := NewClient("xoxb-test", "C123")
	c.apiURL = srv.URL
	c.httpClient = srv.Client()

	if err := c.PostMessage(context.Background(), "<@U01> 例の協賛が確定しました。"); err != nil {
		t.Fatalf("PostMessage: %v", err)
	}
	if gotAuth != "Bearer xoxb-test" {
		t.Fatalf("Authorization = %q", gotAuth)
	}
	if gotBody.Channel != "C123" {
		t.Fatalf("channel = %q", gotBody.Channel)
	}
	if !strings.Contains(gotBody.Text, "協賛が確定") {
		t.Fatalf("text = %q", gotBody.Text)
	}
}

func TestPostMessageErrorWhenSlackReturnsNotOk(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"ok":false,"error":"channel_not_found"}`))
	}))
	defer srv.Close()

	c := NewClient("xoxb-test", "C123")
	c.apiURL = srv.URL
	c.httpClient = srv.Client()

	err := c.PostMessage(context.Background(), "hello")
	if err == nil {
		t.Fatal("expected error when ok=false")
	}
	if !strings.Contains(err.Error(), "channel_not_found") {
		t.Fatalf("error = %v", err)
	}
}
