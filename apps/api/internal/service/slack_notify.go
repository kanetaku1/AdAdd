package service

import (
	"context"
	"log"
	"os"
	"sync"
	"time"

	"github.com/kanetaku1/AdAdd/apps/api/internal/repository"
	"github.com/kanetaku1/AdAdd/apps/api/internal/slack"
)

type slackPoster interface {
	Enabled() bool
	PostMessage(ctx context.Context, text string) error
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
		slackClientDefault = slack.NewClient(
			os.Getenv("SLACK_BOT_TOKEN"),
			os.Getenv("SLACK_CHANNEL_ID"),
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
	return "<@" + slackUserID + "> " + name + " の協賛が確定しました。"
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

	yc, err := NewYearlyCompanyService().GetByID(yearlyCompanyID)
	if err != nil {
		return err
	}
	if yc.AssignedMemberID == nil || *yc.AssignedMemberID == "" {
		return nil
	}

	user, err := repository.NewUserRepository().GetByID(*yc.AssignedMemberID)
	if err != nil {
		return err
	}
	if user.SlackID == "" {
		return nil
	}

	return poster.PostMessage(ctx, ConfirmedMentionText(user.SlackID, yc.CompanyName))
}
