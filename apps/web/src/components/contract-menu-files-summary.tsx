"use client"

import { useState } from "react"
import { ClipboardCheck, Trash2 } from "lucide-react"

import { ContractMenuReviewDialog } from "@/components/contract-menu-review-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ContractMenu, ContractMenuReviewResult } from "@/types/contract-menu"

/** Compact, count-first material display shared by both contract-menu views. */
export function ContractMenuFilesSummary({
  menu,
  deletingFileId,
  onDelete,
  onReviewComplete,
}: {
  menu: ContractMenu
  deletingFileId?: string | null
  onDelete?: (fileId: string) => void
  onReviewComplete?: (result: ContractMenuReviewResult) => void
}) {
  const [reviewOpen, setReviewOpen] = useState(false)

  if (menu.fileCount === 0) {
    return <span className="text-sm text-muted-foreground">未提出</span>
  }

  return (
    <div className="flex items-center gap-1">
      <details className="group relative">
        <summary className="list-none cursor-pointer">
          <Badge variant="outline">資料 {menu.fileCount}件</Badge>
        </summary>
        <div className="absolute right-0 z-20 mt-1 w-80 max-w-[80vw] rounded-md border bg-background p-2 shadow-lg">
          <ul className="space-y-1">
            {menu.files.map((file) => (
              <li key={file.id} className="flex items-center gap-2">
                <a
                  href={file.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-sm text-blue-600 hover:underline"
                  title={file.driveFileName}
                >
                  {file.driveFileName}
                </a>
                {onDelete && menu.allowDelete && (
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    disabled={deletingFileId === file.id}
                    aria-label={`${file.driveFileName}を削除`}
                    onClick={(event) => {
                      event.preventDefault()
                      onDelete(file.id)
                    }}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </details>
      {menu.currentSubmission && (
        <>
          <div className="flex items-center gap-1">
            {(menu.reviewIndicator === "UNREVIEWED" ||
              menu.reviewIndicator === "REVIEWED") && (
              <span
                className={
                  menu.reviewIndicator === "REVIEWED"
                    ? "size-2 rounded-full bg-green-500"
                    : "size-2 rounded-full bg-red-500"
                }
                title={
                  menu.reviewIndicator === "REVIEWED"
                    ? "レビュー済み"
                    : "未レビュー"
                }
                aria-label={
                  menu.reviewIndicator === "REVIEWED"
                    ? "レビュー済み"
                    : "未レビュー"
                }
              />
            )}
            {menu.allowReview && (
              <Button type="button" size="sm" variant="outline" onClick={() => setReviewOpen(true)}>
                <ClipboardCheck /> Review
              </Button>
            )}
          </div>
          {reviewOpen && menu.allowReview && (
            <ContractMenuReviewDialog
              menu={menu}
              open={reviewOpen}
              onOpenChange={setReviewOpen}
              onReviewed={onReviewComplete}
            />
          )}
        </>
      )}
    </div>
  )
}
