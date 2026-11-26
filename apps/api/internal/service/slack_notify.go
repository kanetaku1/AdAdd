package service

import (
	"context"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/config"
	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"github.com/kanetaku1/AdAdd/apps/api/internal/slack"
)

type slackPoster interface {
	Enabled() bool
	PostMessage(ctx context.Context, text string) error
}

type SlackDeliveryResult struct {
	Status string `json:"status"`
	Reason string `json:"reason,omitempty"`
}

type assigneeSlackTarget struct {
	SlackUserID string
	CompanyName string
}

var (
	slackPosterOverride slackPoster
	slackClientOnce     sync.Once
	slackClientDefault  slackPoster
)

func SetSlackPosterForTest(p slackPoster) {
	slackPosterOverride = p
}

func getSlackPoster() slackPoster {
	if slackPosterOverride != nil {
		return slackPosterOverride
	}
	slackClientOnce.Do(func() {
		cfg := config.Load()
		slackClientDefault = slack.NewClient(
			cfg.SlackBotToken,
			cfg.SlackChannelID,
		)
	})
	return slackClientDefault
}

func ShouldNotifyConfirmed(oldProgress, newProgress string) bool {
	return newProgress == "CONFIRMED" && oldProgress != "CONFIRMED"
}

func ConfirmedMentionText(slackUserID, companyName string) string {
	name := companyName
	if name == "" {
		name = "企業"
	}
	return "<@" + escapeSlackMrkdwn(slackUserID) + "> " + escapeSlackMrkdwn(name) + " の協賛が確定しました。"
}

func ReviewChangesMentionText(slackUserID, companyName string, missingItems []string, note string) string {
	name := companyName
	if name == "" {
		name = "企業"
	}
	lines := []string{"<@" + escapeSlackMrkdwn(slackUserID) + "> " + escapeSlackMrkdwn(name) + " の広告資料レビュー結果です。"}
	if len(missingItems) > 0 {
		lines = append(lines, "以下の項目を確認し、再提出してください。")
		for _, item := range missingItems {
			lines = append(lines, "・"+escapeSlackMrkdwn(item))
		}
	} else if strings.TrimSpace(note) != "" {
		lines = append(lines, "以下の内容を確認し、再提出してください。")
	}
	if note = strings.TrimSpace(note); note != "" {
		lines = append(lines, "補足:", escapeSlackMrkdwn(note))
	}
	return strings.Join(lines, "\n")
}

func escapeSlackMrkdwn(value string) string {
	value = strings.ReplaceAll(value, "&", "&amp;")
	value = strings.ReplaceAll(value, "<", "&lt;")
	return strings.ReplaceAll(value, ">", "&gt;")
}

// NotifyAssigneeOnConfirmedAsync mentions the assigned Sponsorship Member
// when progress becomes Confirmed (UC-16, FR-014). Runs after the write
// succeeds; Slack errors are logged and never returned to the caller.
func NotifyAssigneeOnConfirmedAsync(yearlyCompanyID, oldProgress, newProgress string) {
	if !ShouldNotifyConfirmed(oldProgress, newProgress) {
		return
	}
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("slack notify panic: %v", r)
			}
		}()
		ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
		defer cancel()
		if err := notifyAssigneeConfirmed(ctx, yearlyCompanyID); err != nil {
			log.Printf("slack notify: %v", err)
		}
	}()
}

func notifyAssigneeConfirmed(ctx context.Context, yearlyCompanyID string) error {
	poster := getSlackPoster()
	if poster == nil || !poster.Enabled() {
		return nil
	}
	target, reason, err := resolveAssigneeSlackTarget(yearlyCompanyID)
	if err != nil {
		return err
	}
	if reason != "" {
		return nil
	}
	return poster.PostMessage(ctx, ConfirmedMentionText(target.SlackUserID, target.CompanyName))
}

func resolveAssigneeSlackTarget(yearlyCompanyID string) (*assigneeSlackTarget, string, error) {
	yc, err := NewYearlyCompanyService().GetByID(yearlyCompanyID)
	if err != nil {
		return nil, "", err
	}
	if yc.AssignedMemberID == nil || *yc.AssignedMemberID == "" {
		return nil, "NO_ASSIGNEE", nil
	}
	user, err := repository.NewUserRepository().GetByID(*yc.AssignedMemberID)
	if err != nil {
		return nil, "", err
	}
	if strings.TrimSpace(user.SlackID) == "" {
		return nil, "NO_SLACK_ID", nil
	}
	return &assigneeSlackTarget{SlackUserID: user.SlackID, CompanyName: yc.CompanyName}, "", nil
}

func NotifyAssigneeReviewChanges(ctx context.Context, yearlyCompanyID string, missingItems []string, note string) SlackDeliveryResult {
	poster := getSlackPoster()
	if poster == nil || !poster.Enabled() {
		return SlackDeliveryResult{Status: "SKIPPED", Reason: "NOT_CONFIGURED"}
	}
	target, reason, err := resolveAssigneeSlackTarget(yearlyCompanyID)
	if err != nil {
		return SlackDeliveryResult{Status: "FAILED", Reason: err.Error()}
	}
	if reason != "" {
		return SlackDeliveryResult{Status: "SKIPPED", Reason: reason}
	}
	if err := poster.PostMessage(ctx, ReviewChangesMentionText(target.SlackUserID, target.CompanyName, missingItems, note)); err != nil {
		return SlackDeliveryResult{Status: "FAILED", Reason: err.Error()}
	}
	return SlackDeliveryResult{Status: "SENT"}
}
