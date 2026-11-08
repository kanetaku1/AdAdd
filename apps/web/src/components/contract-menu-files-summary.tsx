"use client"

import { Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ContractMenu } from "@/types/contract-menu"

/** Compact, count-first material display shared by both contract-menu views. */
export function ContractMenuFilesSummary({
  menu,
  deletingFileId,
  onDelete,
}: {
  menu: ContractMenu
  deletingFileId?: string | null
  onDelete?: (fileId: string) => void
}) {
  if (menu.fileCount === 0) {
    return <span className="text-sm text-muted-foreground">未提出</span>
  }

  return (
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
  )
}
