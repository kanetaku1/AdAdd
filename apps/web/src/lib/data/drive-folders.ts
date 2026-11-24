import { apiFetch } from "@/lib/api/client"

export type DriveFolderEntry = {
  id: string
  name: string
  hasChildren?: boolean
}

export type DriveFolderListing = {
  current: DriveFolderEntry
  ancestors: DriveFolderEntry[]
  folders: DriveFolderEntry[]
}

export async function fetchDriveFolders(
  parentId?: string,
  options?: { hasChildren?: boolean }
): Promise<DriveFolderListing> {
  const params = new URLSearchParams()
  if (parentId) params.set("parent", parentId)
  if (options?.hasChildren) params.set("hasChildren", "true")
  const query = params.toString() ? `?${params.toString()}` : ""
  const raw = await apiFetch<DriveFolderListing>(`/drive/folders${query}`)
  return {
    ...raw,
    ancestors: raw.ancestors ?? [],
    folders: raw.folders ?? [],
  }
}

export type AutoFolderResult = {
  companyFolderId: string
  categoryFolders: Record<string, string>
}

export async function ensureDriveFolderStructure(
  contractMenuId: string,
  category: string
): Promise<AutoFolderResult> {
  return apiFetch<AutoFolderResult>(
    `/contract-menus/${contractMenuId}/drive-folder`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    }
  )
}
