"use client"

import { useState } from "react"
import { useDropzone } from "react-dropzone"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ErrorBanner } from "@/components/query-state"
import { uploadContractMenuToDrive } from "@/lib/data/sponsorship"
import { ensureDriveFolderStructure } from "@/lib/data/drive-folders"
import { getErrorMessage } from "@/lib/errors"
import { ApiError } from "@/lib/api/client"
import { DriveFolderBrowser } from "@/components/drive-folder-browser"
import {
    DataCategorySelector,
    type DataCategory,
} from "@/components/data-category-selector"
import type { ContractMenu } from "@/types/contract-menu"

type UploadMode = "auto" | "manual"

export function DriveUploadDialog({
    menuId,
    open,
    onOpenChange,
    onSuccess,
    fixedCategory,
    title = "Driveへアップロード",
}: {
    menuId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: (updated: ContractMenu) => void
    fixedCategory?: DataCategory
    title?: string
}) {
    const [files, setFiles] = useState<File[]>([])
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [mode, setMode] = useState<UploadMode>("auto")
    const [category, setCategory] = useState<DataCategory | null>(fixedCategory ?? null)
    const [showBrowser, setShowBrowser] = useState(false)

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        multiple: true,
        onDrop: (acceptedFiles) => {
            setFiles(acceptedFiles)
        },
    })

    async function handleAutoUpload() {
        if (files.length === 0 || !category) return

        setBusy(true)
        setError(null)
        try {
            const structure = await ensureDriveFolderStructure(menuId, category)
            const folderId = structure.categoryFolders[category]
            if (!folderId) {
                setError("フォルダの自動生成に失敗しました。手動モードをお試しください。")
                return
            }
            const updated = await uploadContractMenuToDrive(menuId, files, folderId, category)
            onSuccess?.(updated)
            onOpenChange(false)
        } catch (err) {
            setError(getErrorMessage(err, { fallback: "アップロードに失敗しました" }))
        } finally {
            setBusy(false)
        }
    }

    function handleManualFolderSelect(folderId: string) {
        setShowBrowser(false)
        void doManualUpload(folderId)
    }

    async function doManualUpload(folderId: string) {
        if (files.length === 0) return

        setBusy(true)
        setError(null)
        try {
            const updated = await uploadContractMenuToDrive(menuId, files, folderId)
            onSuccess?.(updated)
            onOpenChange(false)
        } catch (err) {
            if (err instanceof ApiError && err.code === "INVALID_REQUEST") {
                const detail: Record<string, string> = {
                    "folderId is required": "アップロード先フォルダを選択してください。",
                    "multipart form is required": "アップロードデータを読み取れませんでした。ファイルを選び直してください。",
                    "file or files is required": "アップロードするファイルを選択してください。",
                    "file is required": "アップロードするファイルを選択してください。",
                }
                setError(detail[err.message] ?? `アップロード内容を確認してください。（${err.message}）`)
            } else {
                setError(getErrorMessage(err, { fallback: "アップロードに失敗しました" }))
            }
        } finally {
            setBusy(false)
        }
    }

    function resetState() {
        setFiles([])
        setMode("auto")
        setCategory(fixedCategory ?? null)
        setShowBrowser(false)
        setError(null)
    }

    const hasFiles = files.length > 0

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!busy) onOpenChange(val)
            if (!val) resetState()
        }}>
            <DialogContent className="sm:max-w-5xl w-[90vw]">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>

                <ErrorBanner message={error} />

                {/* File drop zone */}
                <div
                    {...getRootProps()}
                    className={`border-2 border-dashed p-6 text-center rounded-md cursor-pointer transition-colors ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:bg-gray-50"
                        }`}
                >
                    <input {...getInputProps()} />
                    {files.length > 0 ? (
                        <div className="space-y-1 text-left font-medium text-green-700">
                            <div>選択済み: {files.length}件</div>
                            {files.map((file) => <div key={`${file.name}-${file.lastModified}`} className="truncate text-sm">{file.name}</div>)}
                        </div>
                    ) : (
                        <div className="text-gray-500">
                            {isDragActive
                                ? "ここにファイルをドロップ..."
                                : "複数ファイルをドラッグ＆ドロップ、またはクリックして選択"}
                        </div>
                    )}
                </div>

                {hasFiles && !showBrowser && (
                    <>
                        {/* Mode toggle */}
                        {!fixedCategory && <div className="flex items-center gap-2 text-sm">
                            <button
                                type="button"
                                className={`px-2 py-1 rounded ${mode === "auto" ? "bg-muted font-medium" : "hover:bg-muted/50"}`}
                                onClick={() => setMode("auto")}
                            >
                                自動
                            </button>
                            <button
                                type="button"
                                className={`px-2 py-1 rounded ${mode === "manual" ? "bg-muted font-medium" : "hover:bg-muted/50"}`}
                                onClick={() => setMode("manual")}
                            >
                                手動
                            </button>
                        </div>}

                        {mode === "auto" ? (
                            <div className="space-y-3">
                                {fixedCategory ? (
                                    <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                                        保存先のデータ区分: <span className="font-medium">{fixedCategory}</span>
                                    </p>
                                ) : (
                                    <DataCategorySelector value={category} onChange={setCategory} />
                                )}
                                <div className="flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>キャンセル</Button>
                                    <Button onClick={() => void handleAutoUpload()} disabled={!category || busy}>
                                        {busy ? "アップロード中..." : "アップロード"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>キャンセル</Button>
                                <Button onClick={() => setShowBrowser(true)} disabled={busy}>
                                    フォルダを選択
                                </Button>
                            </div>
                        )}
                    </>
                )}

                {showBrowser && (
                    <DriveFolderBrowser
                        onSelect={handleManualFolderSelect}
                        onCancel={() => setShowBrowser(false)}
                    />
                )}

                {!hasFiles && (
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>キャンセル</Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
