"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Folder, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { ErrorBanner } from "@/components/query-state"
import { Skeleton } from "@/components/ui/skeleton"
import { uploadContractMenuToDrive } from "@/lib/data/sponsorship"
import { fetchDriveFolders, type DriveFolderEntry } from "@/lib/data/drive-folders"
import { getErrorMessage } from "@/lib/errors"
import { ApiError } from "@/lib/api/client"
import type { ContractMenu } from "@/types/contract-menu"

export function DriveUploadDialog({
    menuId,
    open,
    onOpenChange,
    onSuccess,
}: {
    menuId: string
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: (updated: ContractMenu) => void
}) {
    const [files, setFiles] = useState<File[]>([])
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Folder browser state
    const [browsing, setBrowsing] = useState(false)
    const [currentFolder, setCurrentFolder] = useState<DriveFolderEntry | null>(null)
    const [ancestors, setAncestors] = useState<DriveFolderEntry[]>([])
    const [subfolders, setSubfolders] = useState<DriveFolderEntry[]>([])
    const [loadingFolders, setLoadingFolders] = useState(false)
    const [folderError, setFolderError] = useState<string | null>(null)

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        multiple: true,
        onDrop: (acceptedFiles) => {
            setFiles(acceptedFiles)
        },
    })

    const loadFolder = useCallback(async (parentId?: string) => {
        setLoadingFolders(true)
        setFolderError(null)
        try {
            const listing = await fetchDriveFolders(parentId)
            setCurrentFolder(listing.current)
            setAncestors(listing.ancestors)
            setSubfolders(listing.folders)
        } catch (err) {
            setFolderError(getErrorMessage(err, { fallback: "フォルダの読み込みに失敗しました" }))
        } finally {
            setLoadingFolders(false)
        }
    }, [])

    function handleStartBrowsing() {
        setBrowsing(true)
        void loadFolder()
    }

    function handleNavigate(folderId: string) {
        void loadFolder(folderId)
    }

    async function handleUpload() {
        if (files.length === 0 || !currentFolder) return

        setBusy(true)
        setError(null)
        try {
            const updated = await uploadContractMenuToDrive(menuId, files, currentFolder.id)
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
        setBrowsing(false)
        setCurrentFolder(null)
        setAncestors([])
        setSubfolders([])
        setFolderError(null)
        setError(null)
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!busy) onOpenChange(val)
            if (!val) resetState()
        }}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Driveへアップロード</DialogTitle>
                </DialogHeader>

                <ErrorBanner message={error} />

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

                {browsing && (
                    <div className="space-y-2">
                        <ErrorBanner message={folderError} />

                        {/* Breadcrumb */}
                        {currentFolder && (
                            <nav className="flex items-center gap-1 text-sm text-muted-foreground overflow-x-auto">
                                {ancestors.map((ancestor) => (
                                    <span key={ancestor.id} className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            className="hover:underline text-blue-600"
                                            onClick={() => handleNavigate(ancestor.id)}
                                        >
                                            {ancestor.name}
                                        </button>
                                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                    </span>
                                ))}
                                <span className="font-medium text-foreground shrink-0">{currentFolder.name}</span>
                            </nav>
                        )}

                        {/* Folder list */}
                        <div className="border rounded-md max-h-48 overflow-y-auto">
                            {loadingFolders ? (
                                <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                                    <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
                                    読み込み中…
                                </div>
                            ) : subfolders.length === 0 ? (
                                <div className="p-3 text-sm text-muted-foreground">
                                    サブフォルダはありません
                                </div>
                            ) : (
                                <ul>
                                    {subfolders.map((folder) => (
                                        <li key={folder.id}>
                                            <button
                                                type="button"
                                                className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                                                onClick={() => handleNavigate(folder.id)}
                                            >
                                                <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                <span className="truncate">{folder.name}</span>
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>キャンセル</Button>
                    {!browsing ? (
                        <Button onClick={handleStartBrowsing} disabled={files.length === 0 || busy}>
                            フォルダを選択してアップロード
                        </Button>
                    ) : (
                        <Button onClick={() => void handleUpload()} disabled={files.length === 0 || !currentFolder || busy}>
                            {busy ? "アップロード中..." : "このフォルダにアップロード"}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
