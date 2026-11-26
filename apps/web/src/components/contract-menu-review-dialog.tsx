"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Clock3, ExternalLink, MessageSquareWarning } from "lucide-react"

import { ErrorBanner } from "@/components/query-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  getContractMenuReviewWorkflow,
  reviewContractMenuSubmission,
} from "@/lib/data/sponsorship"
import { cn } from "@/lib/utils"
import type {
  ContractMenu,
  ContractMenuReviewItemResult,
  ContractMenuReviewResult,
  ContractMenuReviewWorkflow,
} from "@/types/contract-menu"

const RESULT_OPTIONS: Array<{
  value: ContractMenuReviewItemResult
  label: string
}> = [
  { value: "PASS", label: "適合" },
  { value: "FAIL", label: "不適合" },
  { value: "NOT_APPLICABLE", label: "対象外" },
]

const EVENT_LABEL: Record<string, string> = {
  SUBMISSION_CREATED: "資料を提出",
  SUBMISSION_REVIEWED: "資料をレビュー",
  SLACK_NOTIFICATION_SENT: "Slackで修正依頼を送信",
  SLACK_NOTIFICATION_SKIPPED: "Slack通知をスキップ",
  SLACK_NOTIFICATION_FAILED: "Slack通知に失敗",
  SLACK_NOTIFICATION_NOT_REQUIRED: "Slack通知不要",
  STATUS_CHANGED: "ステータスを変更",
}

type Answers = Record<string, Record<string, ContractMenuReviewItemResult>>

function answersFromWorkflow(workflow: ContractMenuReviewWorkflow): Answers {
  const submission = workflow.submissions.at(-1)
  if (!submission) return {}
  const answers: Answers = {}
  for (const review of submission.reviews) {
    answers[review.fileId] = Object.fromEntries(
      review.items.map((item) => [item.itemCode, item.result])
    )
  }
  return answers
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function compactText(value: string, maxLength = 80): string {
  const normalized = value.trim().replace(/\s+/g, " ")
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength)}…`
    : normalized
}

function reviewEventFeedback(details: Record<string, unknown> | null): {
  missingItems: string[]
  note: string
} {
  if (!details) return { missingItems: [], note: "" }
  const missingItems = Array.isArray(details.missingItems)
    ? details.missingItems.filter((item): item is string => typeof item === "string")
    : []
  return {
    missingItems,
    note: typeof details.note === "string" ? details.note.trim() : "",
  }
}

export function ContractMenuReviewDialog({
  menu,
  open,
  onOpenChange,
  onReviewed,
}: {
  menu: ContractMenu
  open: boolean
  onOpenChange: (open: boolean) => void
  onReviewed?: (result: ContractMenuReviewResult) => void
}) {
  const [workflow, setWorkflow] = useState<ContractMenuReviewWorkflow | null>(null)
  const [answers, setAnswers] = useState<Answers>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [delivery, setDelivery] = useState<ContractMenuReviewResult["slackDelivery"] | null>(null)
  const [hasOtherIssue, setHasOtherIssue] = useState(false)
  const [reviewNote, setReviewNote] = useState("")

  useEffect(() => {
    if (!open) return
    let active = true
    void getContractMenuReviewWorkflow(menu.id)
      .then((next) => {
        if (!active) return
        setWorkflow(next)
        setAnswers(answersFromWorkflow(next))
        const savedNote = next.submissions.at(-1)?.reviewNote?.trim() ?? ""
        setReviewNote(savedNote)
        setHasOtherIssue(savedNote !== "")
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "レビュー情報を取得できませんでした")
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [menu.id, open])

  const submission = workflow?.submissions.at(-1) ?? null
  const editable = Boolean(
    submission && submission.reviewStatus === "PENDING" && menu.allowReview
  )
  const complete = Boolean(
    submission &&
      workflow &&
      submission.files.every((file) =>
        workflow.checklist.every((item) => answers[file.id]?.[item.code])
      ) &&
      (!hasOtherIssue || reviewNote.trim() !== "")
  )
  const failedItems = useMemo(() => {
    if (!submission || !workflow) return []
    return submission.files.flatMap((file) =>
      workflow.checklist
        .filter((item) => answers[file.id]?.[item.code] === "FAIL")
        .map((item) => `${file.driveFileName}: ${item.label}`)
    )
  }, [answers, submission, workflow])
  const requestsChanges = failedItems.length > 0 || hasOtherIssue

  async function submitReview() {
    if (!submission || !workflow || !complete) return
    setSubmitting(true)
    setError(null)
    try {
      const result = await reviewContractMenuSubmission(
        menu.id,
        submission.id,
        submission.files.map((file) => ({
          fileId: file.id,
          items: answers[file.id],
        })),
        hasOtherIssue ? reviewNote.trim() : ""
      )
      setWorkflow(result.workflow)
      setAnswers(answersFromWorkflow(result.workflow))
      const savedNote = result.workflow.submissions.at(-1)?.reviewNote?.trim() ?? ""
      setReviewNote(savedNote)
      setHasOtherIssue(savedNote !== "")
      setDelivery(result.slackDelivery)
      onReviewed?.(result)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "レビューを保存できませんでした")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>提出資料のレビュー</DialogTitle>
          <DialogDescription>
            ファイルごとに全項目を確認します。不適合の項目と「その他」の内容が担当者へのSlack通知に含まれます。
          </DialogDescription>
        </DialogHeader>

        <ErrorBanner message={error} />
        {loading && <p className="py-8 text-center text-muted-foreground">読み込み中...</p>}
        {!loading && !submission && (
          <p className="rounded-md border p-4 text-muted-foreground">レビュー対象の提出はありません。</p>
        )}

        {submission && workflow && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={submission.reviewStatus === "PENDING" ? "outline" : "secondary"}>
                第{submission.sequence}回提出
              </Badge>
              {!editable && submission.reviewStatus === "PENDING" && (
                <span className="text-xs text-muted-foreground">
                  権限または年度制約により閲覧のみ可能です
                </span>
              )}
            </div>

            {submission.files.map((file) => (
              <section key={file.id} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="min-w-0 truncate font-medium" title={file.driveFileName}>
                    {file.driveFileName}
                  </h3>
                  <Button variant="outline" size="sm" render={<a href={file.driveUrl} target="_blank" rel="noreferrer" />}>
                    Driveで開く <ExternalLink />
                  </Button>
                </div>
                <div className="space-y-3">
                  {workflow.checklist.map((item) => (
                    <div key={item.code} className="grid gap-2 rounded-md bg-muted/40 p-3 md:grid-cols-[1fr_auto] md:items-center">
                      <div>
                        <p className="font-medium">{item.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-1" aria-label={item.label}>
                        {RESULT_OPTIONS.map((option) => {
                          const selected = answers[file.id]?.[item.code] === option.value
                          return (
                            <Button
                              key={option.value}
                              type="button"
                              size="sm"
                              variant={selected ? "default" : "outline"}
                              disabled={!editable || submitting}
                              className={cn(option.value === "FAIL" && selected && "bg-destructive text-white hover:bg-destructive/90")}
                              onClick={() => setAnswers((current) => ({
                                ...current,
                                [file.id]: { ...current[file.id], [item.code]: option.value },
                              }))}
                            >
                              {option.label}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {editable && (
              <section className="space-y-3 rounded-lg border p-4">
                <label className="flex items-center justify-between gap-3 text-sm font-medium">
                  <span>その他（チェックリスト外の不適合）</span>
                  <Switch
                    checked={hasOtherIssue}
                    disabled={!editable || submitting}
                    onCheckedChange={(checked) => {
                      setHasOtherIssue(checked)
                      if (!checked) setReviewNote("")
                    }}
                    aria-label="その他の不適合を入力"
                  />
                </label>
                {hasOtherIssue && (
                  <div className="space-y-1.5">
                    <label htmlFor={`review-note-${submission.id}`} className="text-xs text-muted-foreground">
                      チェックリスト外の不適合内容
                    </label>
                    <Textarea
                      id={`review-note-${submission.id}`}
                      value={reviewNote}
                      maxLength={2000}
                      disabled={!editable || submitting}
                      placeholder="例：就職活動に関連する広告は掲載不可です"
                      onChange={(event) => setReviewNote(event.target.value)}
                    />
                    <p className="text-right text-xs text-muted-foreground">
                      {reviewNote.length} / 2000
                    </p>
                  </div>
                )}
              </section>
            )}

            {editable && requestsChanges && (
              <section className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
                <h3 className="flex items-center gap-2 font-medium"><MessageSquareWarning /> Slack通知プレビュー</h3>
                <p className="mt-1 text-xs text-muted-foreground">次の不適合内容を担当者へのメンション付きで送信します。</p>
                {failedItems.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {failedItems.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                )}
                {hasOtherIssue && reviewNote.trim() && (
                  <div className="mt-3 rounded-md bg-background/70 p-3 text-sm">
                    <p className="font-medium">その他</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{reviewNote.trim()}</p>
                  </div>
                )}
              </section>
            )}

            {delivery && (
              <p className="rounded-md border px-3 py-2 text-sm">
                Slack通知: {delivery.status === "SENT" ? "送信済み" : delivery.status === "NOT_REQUIRED" ? "通知不要（全項目適合）" : delivery.status === "SKIPPED" ? "未送信" : "送信失敗"}
                {delivery.reason ? `（${delivery.reason}）` : ""}
              </p>
            )}

            <section className="space-y-3 border-t pt-4">
              <h3 className="font-medium">履歴</h3>
              {workflow.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">履歴はありません。</p>
              ) : (
                <ol className="space-y-3">
                  {[...workflow.events].reverse().map((event) => {
                    const feedback = event.eventType === "SUBMISSION_REVIEWED"
                      ? reviewEventFeedback(event.details)
                      : { missingItems: [], note: "" }
                    return (
                      <li key={event.id} className="flex gap-3 text-sm">
                        {event.eventType === "SUBMISSION_REVIEWED" ? <CheckCircle2 className="mt-0.5 text-green-600" /> : <Clock3 className="mt-0.5 text-muted-foreground" />}
                        <div className="min-w-0">
                          <p>{EVENT_LABEL[event.eventType] ?? event.eventType}</p>
                          {feedback.missingItems.length > 0 && (
                            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400" title={feedback.missingItems.join("、")}>
                              {compactText(feedback.missingItems[0])}
                              {feedback.missingItems.length > 1 ? ` ほか${feedback.missingItems.length - 1}件` : ""}
                              が不適切だったため修正依頼
                            </p>
                          )}
                          {feedback.note && (
                            <p className="mt-1 text-xs text-amber-700 dark:text-amber-400" title={feedback.note}>
                              その他: {compactText(feedback.note)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {event.actorName ?? "システム"} ・ {formatDate(event.createdAt)}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>閉じる</Button>
          {editable && (
            <Button type="button" disabled={!complete || submitting} onClick={() => void submitReview()}>
              {submitting ? "保存中..." : requestsChanges ? "修正依頼を送信" : "レビューを完了"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
