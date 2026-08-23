"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type { ActivityLog } from "@/types/activity-log"

const ACTIVITY_EVENT_LABEL = {
  MANUAL_NOTE: "手動メモ",
  PROGRESS_UPDATED: "進捗更新",
  ASSIGNMENT_UPDATED: "担当変更",
  CONTRACT_CREATED: "契約作成",
} as const

/**
 * Activity Log block on Yearly Company Detail
 * (spec/frontend.md#Yearly Company Detail → Activity Log).
 * Collapsed by default — it is a supplementary view, not a primary one.
 * System-generated only; there is no manual entry action.
 */
export function ActivityLogSection({ logs }: { logs: ActivityLog[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      render={<section className="flex flex-col gap-3" />}
    >
      <h2 className="font-medium">
        <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md text-left hover:text-foreground/80">
          <ChevronDown
            className={cn(
              "size-4 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
          Activity Log
          <span className="font-normal text-muted-foreground">
            ({logs.length})
          </span>
        </CollapsibleTrigger>
      </h2>

      <CollapsibleContent>
        <div className="rounded-md border">
          {logs.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              Activity Log はまだありません。
            </p>
          ) : (
            <ul className="divide-y">
              {logs.map((log) => (
                <li
                  key={log.id}
                  className="flex flex-col gap-1 px-3 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {ACTIVITY_EVENT_LABEL[log.eventType]}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("ja-JP")}
                    </span>
                    <span className="text-muted-foreground">
                      {log.createdByName ?? "(不明なユーザー)"}
                    </span>
                  </div>
                  <p>{log.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
