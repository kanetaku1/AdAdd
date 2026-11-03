// Command drive-auth performs the one-time offline OAuth authorization for
// ADR-0006's dedicated Google account. Run it from apps/api after registering
// http://127.0.0.1:8787/callback on the OAuth client.
package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"flag"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/kanetaku1/AdAdd/apps/api/internal/config"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"google.golang.org/api/drive/v3"
)

type callbackResult struct {
	code string
	err  error
}

func main() {
	envFile := flag.String("env-file", "../../.env", "gitignored env file to update")
	flag.Parse()

	if err := godotenv.Overload(*envFile); err != nil && !os.IsNotExist(err) {
		log.Fatalf("load Drive environment file: %v", err)
	}
	cfg := config.Load()
	if cfg.GoogleDriveClientID == "" || cfg.GoogleDriveClientSecret == "" {
		log.Fatal("GOOGLE_DRIVE_CLIENT_ID (or GOOGLE_CLIENT_ID) and GOOGLE_DRIVE_CLIENT_SECRET are required")
	}

	const redirectURL = "http://127.0.0.1:8787/callback"
	oauthConfig := &oauth2.Config{
		ClientID:     cfg.GoogleDriveClientID,
		ClientSecret: cfg.GoogleDriveClientSecret,
		RedirectURL:  redirectURL,
		Endpoint:     google.Endpoint,
		Scopes:       []string{drive.DriveScope},
	}
	state := randomState()
	results := make(chan callbackResult, 1)
	mux := http.NewServeMux()
	mux.HandleFunc("/callback", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Query().Get("state") != state {
			http.Error(w, "認証状態が一致しません。最初からやり直してください。", http.StatusBadRequest)
			results <- callbackResult{err: fmt.Errorf("OAuth state mismatch")}
			return
		}
		if oauthErr := r.URL.Query().Get("error"); oauthErr != "" {
			http.Error(w, "Google Drive連携がキャンセルされました。", http.StatusBadRequest)
			results <- callbackResult{err: fmt.Errorf("Google OAuth error: %s", oauthErr)}
			return
		}
		code := r.URL.Query().Get("code")
		if code == "" {
			http.Error(w, "認証コードがありません。", http.StatusBadRequest)
			results <- callbackResult{err: fmt.Errorf("authorization code is missing")}
			return
		}
		_, _ = fmt.Fprintln(w, "Google Drive連携を確認しました。この画面を閉じてください。")
		results <- callbackResult{code: code}
	})

	listener, err := net.Listen("tcp", "127.0.0.1:8787")
	if err != nil {
		log.Fatalf("start callback listener: %v", err)
	}
	server := &http.Server{Handler: mux, ReadHeaderTimeout: 10 * time.Second}
	go func() {
		if err := server.Serve(listener); err != nil && err != http.ErrServerClosed {
			log.Printf("callback server: %v", err)
		}
	}()

	authOptions := []oauth2.AuthCodeOption{oauth2.AccessTypeOffline, oauth2.ApprovalForce}
	if cfg.GoogleDriveAccountEmail != "" {
		authOptions = append(authOptions, oauth2.SetAuthURLParam("login_hint", cfg.GoogleDriveAccountEmail))
	}
	fmt.Println("次のURLをブラウザで開き、専用Googleアカウントで認証してください:")
	fmt.Println(oauthConfig.AuthCodeURL(state, authOptions...))

	select {
	case result := <-results:
		shutdown(server)
		if result.err != nil {
			log.Fatal(result.err)
		}
		token, err := oauthConfig.Exchange(context.Background(), result.code)
		if err != nil {
			log.Fatalf("exchange authorization code: %v", err)
		}
		if token.RefreshToken == "" {
			log.Fatal("Google did not return a refresh token; revoke the existing grant and run again")
		}
		if err := saveCredentials(*envFile, cfg, token.RefreshToken); err != nil {
			log.Fatalf("save Drive credentials: %v", err)
		}
		fmt.Printf("専用Drive認証情報を %s に保存しました。APIを再起動してください。\n", *envFile)
	case <-time.After(5 * time.Minute):
		shutdown(server)
		log.Fatal("authorization timed out")
	}
}

func randomState() string {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		log.Fatalf("generate OAuth state: %v", err)
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

func saveCredentials(path string, cfg *config.Config, refreshToken string) error {
	values, err := godotenv.Read(path)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	if values == nil {
		values = map[string]string{}
	}
	values["GOOGLE_DRIVE_CLIENT_ID"] = cfg.GoogleDriveClientID
	values["GOOGLE_DRIVE_CLIENT_SECRET"] = cfg.GoogleDriveClientSecret
	values["GOOGLE_DRIVE_REFRESH_TOKEN"] = refreshToken
	if cfg.GoogleDriveAccountEmail != "" {
		values["GOOGLE_DRIVE_ACCOUNT_EMAIL"] = cfg.GoogleDriveAccountEmail
	}
	if err := godotenv.Write(values, path); err != nil {
		return err
	}
	_ = os.Chmod(path, 0o600)
	return nil
}

func shutdown(server *http.Server) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}
