"use client"

import { useRef, useState, type ReactNode } from "react"
import { Upload } from "lucide-react"

import { IconActionButton } from "@/components/icon-action-button"
import { EmptyRow, ErrorBanner } from "@/components/query-state"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { downloadCsvTemplate } from "@/lib/csv"
import { getErrorMessage } from "@/lib/errors"
import type { BulkResult } from "@/types/bulk"

export type CsvBulkImportColumn<T> = {
  header: string
  cell: (row: T) => ReactNode
}

/**
 * Shared CSV Preview → Confirm dialog (spec/frontend.md#CSV Import / Export,
 * Issue #66). Callers supply the bulk API (dry-run then write) and the
 * preview columns; this component owns file picking, template download,
 * and the two-step confirm.
 */
export function CsvBulkImportDialog<T>({
  label = "CSVで一括登録",
  title,
  description,
  templateFileName,
  templateHeaders,
  templateExampleRow,
  columns,
  preview,
  confirm,
  onImported,
}: {
  label?: string
  title: string
  description: string
  templateFileName: string
  templateHeaders: readonly string[]
  templateExampleRow: readonly string[]
  columns: CsvBulkImportColumn<T>[]
  preview: (file: File) => Promise<BulkResult<T>>
  confirm: (file: File) => Promise<BulkResult<T>>
  onImported: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<BulkResult<T> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function reset() {
    setFile(null)
    setResult(null)
    setError(null)
    setBusy(false)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) reset()
  }

  async function handleFileChange(next: File | null) {
    setFile(next)
    setResult(null)
    setError(null)
    if (!next) return
    setBusy(true)
    try {
      setResult(await preview(next))
    } catch (e) {
      setError(
        getErrorMessage(e, {
          fallback: "CSVの読み込みに失敗しました",
          overrides: {
            INVALID_REQUEST:
              "CSVの形式が正しくありません。UTF-8で保存し、ヘッダー行を含めてください。",
          },
        })
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirm() {
    if (!file || !result || result.successCount === 0) return
    setBusy(true)
    setError(null)
    try {
      await confirm(file)
      onImported()
      handleOpenChange(false)
    } catch (e) {
      setError(
        getErrorMessage(e, {
          fallback: "一括登録に失敗しました",
          overrides: {
            INVALID_REQUEST:
              "CSVの形式が正しくありません。UTF-8で保存し、ヘッダー行を含めてください。",
            FORBIDDEN: "この操作を行う権限がありません。",
          },
        })
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <IconActionButton
        label={label}
        variant="outline"
        onClick={() => setOpen(true)}
      >
        <Upload />
      </IconActionButton>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                disabled={busy}
                onChange={(e) =>
                  void handleFileChange(e.target.files?.[0] ?? null)
                }
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  downloadCsvTemplate(
                    templateFileName,
                    [...templateHeaders],
                    [...templateExampleRow]
                  )
                }
              >
                テンプレートをダウンロード
              </Button>
            </div>
            {file ? (
              <p className="text-sm text-muted-foreground">{file.name}</p>
            ) : null}

            <ErrorBanner message={error} />

            {busy && !result ? (
              <p className="text-sm text-muted-foreground">確認しています…</p>
            ) : null}

            {result ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm">
                  {result.totalCount}件中、
                  <span className="font-medium">{result.successCount}件</span>
                  を登録できます。エラーは
                  <span className="font-medium">{result.errorCount}件</span>
                  です。エラー行は登録しません。
                </p>

                {result.errors.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">行</TableHead>
                          <TableHead>エラー</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.errors.map((item) => (
                          <TableRow key={`${item.rowNumber}-${item.message}`}>
                            <TableCell>{item.rowNumber}</TableCell>
                            <TableCell className="text-destructive">
                              {item.message}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : null}

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((column) => (
                          <TableHead key={column.header}>{column.header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.successfulRows.length === 0 ? (
                        <EmptyRow
                          colSpan={columns.length}
                          message="登録できる行がありません。"
                        />
                      ) : (
                        result.successfulRows.map((row, index) => (
                          <TableRow key={index}>
                            {columns.map((column) => (
                              <TableCell key={column.header}>
                                {column.cell(row)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={busy || !result || result.successCount === 0}
            >
              {busy && result
                ? "登録中…"
                : result
                  ? `${result.successCount}件を登録`
                  : "登録"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
