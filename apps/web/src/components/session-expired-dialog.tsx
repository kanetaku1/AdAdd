"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SESSION_EXPIRED_EVENT } from "@/lib/api/client"

/**
 * Shown when a save is rejected because the session is no longer valid
 * (spec/frontend.md#Login, Issue #168). The screen is not left, so what the
 * member entered stays; they sign in again in a new tab and save here again.
 */
export function SessionExpiredDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const show = () => setOpen(true)
    window.addEventListener(SESSION_EXPIRED_EVENT, show)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, show)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ログインし直してください</DialogTitle>
          <DialogDescription>
            ログインの有効期限が切れたため、保存できませんでした。入力中の内容はこの画面に残っています。新しいタブでログインし直してから、この画面でもう一度操作してください。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            閉じる
          </Button>
          <Button
            onClick={() => {
              window.open("/login", "_blank", "noopener")
            }}
          >
            新しいタブでログイン
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
