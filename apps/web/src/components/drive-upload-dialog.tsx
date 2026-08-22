"use client"

import { useState, useRef, useEffect } from "react"
import useDrivePicker from "react-google-drive-picker"
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
import { getErrorMessage } from "@/lib/errors"
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
    /** Receives the updated Contract Menu so callers can refresh the row without refetching. */
    onSuccess?: (updated: ContractMenu) => void
}) {
    const [file, setFile] = useState<File | null>(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [openPicker, authResponse] = useDrivePicker()

    const authRef = useRef<unknown>(null)
    useEffect(() => {
        authRef.current = authResponse
    }, [authResponse])

    // Notice: Google Developer Console Client ID and API Key required
    const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""
    const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || ""
    const GOOGLE_DRIVE_ROOT_FOLDER_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_ROOT_FOLDER_ID || ""

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        maxFiles: 1,
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length > 0) {
                setFile(acceptedFiles[0])
            }
        },
    })

    async function handleUploadClick() {
        if (!file) return

        setBusy(true)
        setError(null)
        try {
            openPicker({
                clientId: GOOGLE_CLIENT_ID,
                developerKey: GOOGLE_API_KEY,
                viewId: "FOLDERS",
                setParentFolder: GOOGLE_DRIVE_ROOT_FOLDER_ID,
                showUploadView: false,
                showUploadFolders: true,
                supportDrives: true,
                multiselect: false,
                setSelectFolderEnabled: true,
                customScopes: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/drive.file"],
                callbackFunction: async (data: unknown) => {
                    if (data && typeof data === "object" && (data as { action?: string }).action === "picked") {
                        const pickedData = data as { docs: { id: string }[], accessToken?: string }
                        const folderId = pickedData.docs[0].id

                        const actualAuth = authRef.current as { access_token?: string } | null
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const tokenToUse = actualAuth?.access_token || pickedData.accessToken || (window as any).gapi?.client?.getToken()?.access_token || ""

                        if (!tokenToUse) {
                            setError("Google Driveの認証トークンが取得できませんでした。再度お試しください。")
                            setBusy(false)
                            return
                        }

                        try {
                            const updated = await uploadContractMenuToDrive(menuId, file, folderId, tokenToUse)
                            onSuccess?.(updated)
                            onOpenChange(false)
                        } catch (err) {
                            setError(getErrorMessage(err, { fallback: "アップロードに失敗しました" }))
                        } finally {
                            setBusy(false)
                        }
                    }
                    if (data && typeof data === "object" && (data as { action?: string }).action === "cancel") {
                        setBusy(false)
                    }
                },
            })
        } catch (e) {
            setError(getErrorMessage(e, { fallback: "Pickerの起動に失敗しました" }))
            setBusy(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!busy) onOpenChange(val)
            if (!val) setFile(null)
        }}>
            <DialogContent>
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
                    {file ? (
                        <div className="font-medium text-green-700">選択済み: {file.name}</div>
                    ) : (
                        <div className="text-gray-500">
                            {isDragActive
                                ? "ここにファイルをドロップ..."
                                : "ファイルをドラッグ＆ドロップ、またはクリックして選択"}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>キャンセル</Button>
                    <Button onClick={handleUploadClick} disabled={!file || busy || !GOOGLE_CLIENT_ID}>
                        {busy ? "アップロード中..." : "フォルダを選択してアップロード"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
