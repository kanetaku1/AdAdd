import { getCurrentDevUserId } from "@/lib/api/client"
import { mockUsers } from "@/lib/mock/users"
import type { ActivityEventType, ActivityLog } from "@/types/activity-log"

const now = new Date()
const minutesAgo = (m: number) =>
  new Date(now.getTime() - m * 60 * 1000).toISOString()

export const mockActivityLogs: ActivityLog[] = [
  {
    id: "al_001",
    yearlyCompanyId: "yc_001",
    eventType: "PROGRESS_UPDATED",
    message: "進捗を「請求書送付」に更新",
    createdAt: minutesAgo(220),
    createdById: "user_001",
    createdByName: "田中",
  },
  {
    id: "al_002",
    yearlyCompanyId: "yc_001",
    eventType: "MANUAL_NOTE",
    message: "先方よりメール返信あり。来週中に最終確認予定。",
    createdAt: minutesAgo(120),
    createdById: "user_001",
    createdByName: "田中",
  },
  {
    id: "al_003",
    yearlyCompanyId: "yc_002",
    eventType: "ASSIGNMENT_UPDATED",
    message: "担当メンバーを変更",
    createdAt: minutesAgo(90),
    createdById: "user_003",
    createdByName: "鈴木",
  },
]

export function listMockActivityLogs(yearlyCompanyId: string): ActivityLog[] {
  return mockActivityLogs
    .filter((log) => log.yearlyCompanyId === yearlyCompanyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function addMockActivityLog(input: {
  yearlyCompanyId: string
  eventType: ActivityEventType
  message: string
  createdById?: string | null
}): ActivityLog {
  const createdById = input.createdById ?? getCurrentDevUserId()
  const createdByName =
    mockUsers.find((u) => u.id === createdById)?.name ?? "(不明なユーザー)"
  const created: ActivityLog = {
    id: `al_${crypto.randomUUID()}`,
    yearlyCompanyId: input.yearlyCompanyId,
    eventType: input.eventType,
    message: input.message,
    createdAt: new Date().toISOString(),
    createdById,
    createdByName,
  }
  mockActivityLogs.push(created)
  return created
}
