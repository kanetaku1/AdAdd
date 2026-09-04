package slack

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

const defaultChatPostMessageURL = "https://slack.com/api/chat.postMessage"

type Client struct {
	token      string
	channelID  string
	apiURL     string
	httpClient *http.Client
}

func NewClient(token, channelID string) *Client {
	return &Client{
		token:     token,
		channelID: channelID,
		apiURL:    defaultChatPostMessageURL,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

func (c *Client) Enabled() bool {
	return c != nil && c.token != "" && c.channelID != ""
}

type postMessageRequest struct {
	Channel string `json:"channel"`
	Text    string `json:"text"`
}

type postMessageResponse struct {
	OK    bool   `json:"ok"`
	Error string `json:"error"`
}

func (c *Client) PostMessage(ctx context.Context, text string) error {
	if !c.Enabled() {
		return nil
	}

	body, err := json.Marshal(postMessageRequest{
		Channel: c.channelID,
		Text:    text,
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.apiURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json; charset=utf-8")

	res, err := c.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	raw, err := io.ReadAll(res.Body)
	if err != nil {
		return err
	}
	if res.StatusCode >= 400 {
		return fmt.Errorf("slack HTTP %d: %s", res.StatusCode, string(raw))
	}

	var parsed postMessageResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return fmt.Errorf("slack response: %w", err)
	}
	if !parsed.OK {
		if parsed.Error == "" {
			return fmt.Errorf("slack chat.postMessage failed")
		}
		return fmt.Errorf("slack chat.postMessage: %s", parsed.Error)
	}
	return nil
}
