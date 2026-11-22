"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    ChevronDown,
    ChevronRight,
    Folder,
    FolderOpen,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ErrorBanner } from "@/components/query-state"
import {
    fetchDriveFolders,
    type DriveFolderEntry,
    type DriveFolderListing,
} from "@/lib/data/drive-folders"
import { getErrorMessage } from "@/lib/errors"

type Props = {
    onSelect: (folderId: string, folderName: string) => void
    onCancel: () => void
}

export function DriveFolderBrowser({ onSelect, onCancel }: Props) {
    const [currentId, setCurrentId] = useState<string | null>(null)
    const [currentListing, setCurrentListing] = useState<DriveFolderListing | null>(null)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [selectedName, setSelectedName] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [history, setHistory] = useState<string[]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)

    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
    const [childrenCache, setChildrenCache] = useState<Map<string, DriveFolderEntry[]>>(new Map())
    const [hasChildrenCache, setHasChildrenCache] = useState<Map<string, boolean>>(new Map())
    const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set())

    const rootIdRef = useRef<string | null>(null)

    const cacheChildren = useCallback((parentId: string, folders: DriveFolderEntry[]) => {
        setChildrenCache(prev => {
            const next = new Map(prev)
            next.set(parentId, folders)
            return next
        })
        setHasChildrenCache(prev => {
            const next = new Map(prev)
            next.set(parentId, folders.length > 0)
            for (const f of folders) {
                if (f.hasChildren !== undefined && !next.has(f.id)) {
                    next.set(f.id, f.hasChildren)
                }
            }
            return next
        })
    }, [])

    const navigateToFolder = useCallback(async (folderId?: string, addToHistory = true) => {
        setLoading(true)
        setError(null)
        try {
            const listing = await fetchDriveFolders(folderId, { hasChildren: true })
            setCurrentListing(listing)
            setCurrentId(listing.current.id)
            setSelectedId(null)
            setSelectedName(null)

            if (!rootIdRef.current) {
                rootIdRef.current = folderId
                    ? (listing.ancestors.length > 0 ? listing.ancestors[0].id : listing.current.id)
                    : listing.current.id
            }

            cacheChildren(listing.current.id, listing.folders)

            setExpandedNodes(prev => {
                const next = new Set(prev)
                if (rootIdRef.current) next.add(rootIdRef.current)
                for (const ancestor of listing.ancestors) {
                    next.add(ancestor.id)
                }
                next.add(listing.current.id)
                return next
            })

            if (addToHistory) {
                setHistory(prev => {
                    const truncated = prev.slice(0, historyIndex + 1)
                    return [...truncated, listing.current.id]
                })
                setHistoryIndex(prev => prev + 1)
            }
        } catch (err) {
            setError(getErrorMessage(err, { fallback: "フォルダの読み込みに失敗しました" }))
        } finally {
            setLoading(false)
        }
    }, [historyIndex, cacheChildren])

    useEffect(() => {
        void navigateToFolder()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const canGoBack = historyIndex > 0
    const canGoForward = historyIndex < history.length - 1
    const canGoUp = currentListing && currentListing.ancestors.length > 0

    function handleBack() {
        if (!canGoBack) return
        const prevIndex = historyIndex - 1
        setHistoryIndex(prevIndex)
        void navigateToFolder(history[prevIndex], false)
    }

    function handleForward() {
        if (!canGoForward) return
        const nextIndex = historyIndex + 1
        setHistoryIndex(nextIndex)
        void navigateToFolder(history[nextIndex], false)
    }

    function handleUp() {
        if (!currentListing || currentListing.ancestors.length === 0) return
        const parent = currentListing.ancestors[currentListing.ancestors.length - 1]
        void navigateToFolder(parent.id)
    }

    function handleFolderClick(folder: DriveFolderEntry) {
        setSelectedId(folder.id)
        setSelectedName(folder.name)
    }

    function handleFolderDoubleClick(folder: DriveFolderEntry) {
        void navigateToFolder(folder.id)
    }

    async function toggleTreeNode(nodeId: string) {
        if (expandedNodes.has(nodeId)) {
            setExpandedNodes(prev => {
                const next = new Set(prev)
                next.delete(nodeId)
                return next
            })
            return
        }

        const knownHasChildren = hasChildrenCache.get(nodeId)
        if (knownHasChildren === false) return

        if (!childrenCache.has(nodeId)) {
            setLoadingNodes(prev => new Set(prev).add(nodeId))
            try {
                const listing = await fetchDriveFolders(nodeId, { hasChildren: true })
                cacheChildren(nodeId, listing.folders)
            } catch {
                return
            } finally {
                setLoadingNodes(prev => {
                    const next = new Set(prev)
                    next.delete(nodeId)
                    return next
                })
            }
        }

        setExpandedNodes(prev => new Set(prev).add(nodeId))
    }

    function handleTreeNodeClick(nodeId: string) {
        void navigateToFolder(nodeId)
    }

    function handleConfirmSelection() {
        if (selectedId && selectedName) {
            onSelect(selectedId, selectedName)
        } else if (currentListing) {
            onSelect(currentListing.current.id, currentListing.current.name)
        }
    }

    function renderTreeNode(nodeId: string, nodeName: string, depth: number) {
        const isExpanded = expandedNodes.has(nodeId)
        const isLoading = loadingNodes.has(nodeId)
        const children = childrenCache.get(nodeId)
        const isCurrent = currentId === nodeId
        const knownHasChildren = hasChildrenCache.get(nodeId)
        const isLeaf = knownHasChildren === false

        return (
            <div key={nodeId}>
                <div
                    role="button"
                    tabIndex={0}
                    className={`w-full text-left flex items-center gap-1 py-1 text-sm hover:bg-muted/50 transition-colors rounded-sm cursor-pointer ${isCurrent ? "bg-muted font-medium" : ""}`}
                    style={{ paddingLeft: `${depth * 16 + 4}px` }}
                    onClick={() => handleTreeNodeClick(nodeId)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleTreeNodeClick(nodeId) }}
                >
                    {isLeaf ? (
                        <span className="w-4 shrink-0" />
                    ) : (
                        <span
                            role="button"
                            tabIndex={0}
                            className="p-0.5 hover:bg-muted rounded shrink-0 cursor-pointer"
                            onClick={(e) => {
                                e.stopPropagation()
                                void toggleTreeNode(nodeId)
                            }}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); void toggleTreeNode(nodeId) } }}
                        >
                            {isLoading ? (
                                <Skeleton className="h-3 w-3 rounded-full" />
                            ) : isExpanded ? (
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            )}
                        </span>
                    )}
                    {isExpanded ? (
                        <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                    ) : (
                        <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate">{nodeName}</span>
                </div>
                {isExpanded && children && children.map(child =>
                    renderTreeNode(child.id, child.name, depth + 1)
                )}
            </div>
        )
    }

    const rootId = rootIdRef.current
    const rootName = currentListing
        ? (currentListing.ancestors.length > 0 ? currentListing.ancestors[0].name : currentListing.current.name)
        : "ルート"

    return (
        <div className="flex flex-col border rounded-md overflow-hidden" style={{ height: "480px" }}>
            <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/30 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleBack} disabled={!canGoBack}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleForward} disabled={!canGoForward}>
                    <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleUp} disabled={!canGoUp}>
                    <ArrowUp className="h-4 w-4" />
                </Button>
                <div className="h-4 w-px bg-border mx-1" />
                {currentListing && (
                    <nav className="flex items-center gap-0.5 text-sm text-muted-foreground overflow-x-auto min-w-0">
                        {currentListing.ancestors.map((ancestor) => (
                            <span key={ancestor.id} className="flex items-center gap-0.5 shrink-0">
                                <button
                                    type="button"
                                    className="hover:underline text-blue-600 truncate max-w-[120px]"
                                    onClick={() => navigateToFolder(ancestor.id)}
                                >
                                    {ancestor.name}
                                </button>
                                <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            </span>
                        ))}
                        <span className="font-medium text-foreground shrink-0 truncate max-w-[160px]">
                            {currentListing.current.name}
                        </span>
                    </nav>
                )}
            </div>

            <ErrorBanner message={error} />

            <div className="flex flex-1 min-h-0">
                <div className="w-56 border-r overflow-y-auto py-1 shrink-0">
                    {rootId && renderTreeNode(rootId, rootName, 0)}
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                            <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
                            読み込み中…
                        </div>
                    ) : currentListing && currentListing.folders.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground">
                            サブフォルダはありません
                        </div>
                    ) : currentListing && (
                        <div className="grid grid-cols-3 gap-1">
                            {currentListing.folders.map((folder) => (
                                <button
                                    key={folder.id}
                                    type="button"
                                    className={`flex items-center gap-2 p-2 rounded-md text-sm transition-colors text-left ${selectedId === folder.id
                                        ? "bg-blue-100 dark:bg-blue-900/30 ring-1 ring-blue-300"
                                        : "hover:bg-muted"
                                        }`}
                                    onClick={() => handleFolderClick(folder)}
                                    onDoubleClick={() => handleFolderDoubleClick(folder)}
                                >
                                    <Folder className="h-5 w-5 shrink-0 text-muted-foreground" />
                                    <span className="truncate">{folder.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between px-3 py-2 border-t bg-muted/30 shrink-0">
                <div className="text-sm text-muted-foreground truncate">
                    {selectedName
                        ? <>選択中: <span className="font-medium text-foreground">{selectedName}</span></>
                        : currentListing
                            ? <>現在: <span className="font-medium text-foreground">{currentListing.current.name}</span></>
                            : null
                    }
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={onCancel}>
                        キャンセル
                    </Button>
                    <Button size="sm" onClick={handleConfirmSelection}>
                        このフォルダを選択
                    </Button>
                </div>
            </div>
        </div>
    )
}
