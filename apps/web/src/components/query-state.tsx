import { Skeleton } from "@/components/ui/skeleton"
import { TableCell, TableRow } from "@/components/ui/table"

/**
 * Shared Loading/Error/Empty state primitives (Issue #25 — spec/frontend.md
 * UI Principle: consistent state handling across every screen instead of
 * each page hand-rolling its own loading text / error banner / empty row).
 */

export function LoadingRow({
  colSpan,
  label = "読み込み中…",
}: {
  colSpan: number
  label?: string
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
          {label}
        </div>
      </TableCell>
    </TableRow>
  )
}

export function LoadingBlock({ label = "読み込み中…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border p-4 text-sm text-muted-foreground">
      <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
      {label}
    </div>
  )
}

export function EmptyRow({
  colSpan,
  message,
}: {
  colSpan: number
  message: string
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  )
}

export function EmptyBlock({ message }: { message: string }) {
  return (
    <p className="rounded-md border p-4 text-sm text-muted-foreground">
      {message}
    </p>
  )
}

export function ErrorBanner({ message }: { message: string | null | undefined }) {
  if (!message) return null
  return (
    <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  )
}
