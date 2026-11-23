import { apiFetch } from "@/lib/api/client"

export type DriveFolderEntry = {
  id: string
  name: string
}

export type DriveFolderListing = {
  current: DriveFolderEntry
  ancestors: DriveFolderEntry[]
  folders: DriveFolderEntry[]
}

export async function fetchDriveFolders(
  parentId?: string
): Promise<DriveFolderListing> {
  const query = parentId ? `?parent=${encodeURIComponent(parentId)}` : ""
  const raw = await apiFetch<DriveFolderListing>(`/drive/folders${query}`)
  return {
    ...raw,
    ancestors: raw.ancestors ?? [],
    folders: raw.folders ?? [],
  }
}
