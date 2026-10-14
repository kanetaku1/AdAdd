"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ErrorBanner } from "@/components/query-state"

/**
 * Confirmation step before an Administrator-only deletion
 * (spec/api.md#Authorization Matrix). Rendered only while a target is
 * selected; closing is blocked while the deletion is in flight.
 */
export function DeleteConfirmDialog({
  title,
  description,
  error,
  deleting,
  onCancel,
  onConfirm,
}: {
  title: string
  description: string
  error: string | null
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next && !deleting) onCancel()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ErrorBanner message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={deleting}>
            キャンセル
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={deleting}>
            {deleting ? "削除中..." : "削除"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
