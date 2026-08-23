/**
 * ActivityEventType (spec/api.md#List Activity Logs).
 * MANUAL_NOTE is historical only — new rows are system-generated.
 */
export type ActivityEventType =
  | "MANUAL_NOTE"
  | "PROGRESS_UPDATED"
  | "COMPANY_STATUS_UPDATED"
  | "PHASE_UPDATED"
  | "ASSIGNMENT_UPDATED"
  | "CONTRACT_CREATED"
  | "CONTRACT_MENU_STATUS_UPDATED"
  | "PAYMENT_STATUS_UPDATED"

export type ActivityLog = {
  id: string
  yearlyCompanyId: string
  eventType: ActivityEventType
  message: string
  createdAt: string
  createdById: string | null
  createdByName: string | null
}

export const ACTIVITY_EVENT_LABEL: Record<ActivityEventType, string> = {
  MANUAL_NOTE: "手動メモ",
  PROGRESS_UPDATED: "進捗更新",
  COMPANY_STATUS_UPDATED: "企業ステータス",
  PHASE_UPDATED: "フェーズ",
  ASSIGNMENT_UPDATED: "担当変更",
  CONTRACT_CREATED: "契約作成",
  CONTRACT_MENU_STATUS_UPDATED: "協賛メニュー",
  PAYMENT_STATUS_UPDATED: "入金",
}

export function activityEventLabel(eventType: string): string {
  return ACTIVITY_EVENT_LABEL[eventType as ActivityEventType] ?? eventType
}
