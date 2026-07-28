export type ActivityEventType =
  | "MANUAL_NOTE"
  | "PROGRESS_UPDATED"
  | "ASSIGNMENT_UPDATED"
  | "CONTRACT_CREATED"

export type ActivityLog = {
  id: string
  yearlyCompanyId: string
  eventType: ActivityEventType
  message: string
  createdAt: string
  createdById: string | null
  createdByName: string | null
}
