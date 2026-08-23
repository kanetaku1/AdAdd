import { CONTRACT_MENU_STATUS_LABEL } from "@/lib/contract-menu-labels"
import {
  COMPANY_STATUS_LABEL,
  SPONSORSHIP_PHASE_LABEL,
  SPONSORSHIP_PROGRESS_LABEL,
} from "@/lib/yearly-company-labels"

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

/** 活動記録 timestamps are always shown in JST (spec/domain.md#Activity Log). */
export function formatActivityLogDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return iso
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  return `${get("year")}/${get("month")}/${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`
}

function enumLabel(
  code: string,
  map: Record<string, string>
): string {
  return map[code] ?? code
}

/**
 * Display-time Japanese for legacy English / raw-enum 活動記録 messages.
 * New writes are already Japanese; this keeps older rows readable.
 */
export function normalizeActivityMessage(message: string): string {
  if (message === "Member assigned to YearlyCompany") {
    return "担当メンバーを設定"
  }
  if (
    message === "Member assignment cleared" ||
    message === "Assignment cleared"
  ) {
    return "担当メンバーを解除"
  }

  const enProgress = /^Progress changed from ([A-Z0-9_]+) to ([A-Z0-9_]+)$/i.exec(
    message
  )
  if (enProgress) {
    return `進捗を「${enumLabel(enProgress[1], SPONSORSHIP_PROGRESS_LABEL)}」から「${enumLabel(enProgress[2], SPONSORSHIP_PROGRESS_LABEL)}」に更新`
  }
  const enPhase = /^Phase changed from ([A-Z0-9_]+) to ([A-Z0-9_]+)$/i.exec(
    message
  )
  if (enPhase) {
    return `フェーズを「${enumLabel(enPhase[1], SPONSORSHIP_PHASE_LABEL)}」から「${enumLabel(enPhase[2], SPONSORSHIP_PHASE_LABEL)}」に更新`
  }
  const enCompany =
    /^Company status changed from ([A-Z0-9_]+) to ([A-Z0-9_]+)$/i.exec(message)
  if (enCompany) {
    return `企業ステータスを「${enumLabel(enCompany[1], COMPANY_STATUS_LABEL)}」から「${enumLabel(enCompany[2], COMPANY_STATUS_LABEL)}」に更新`
  }

  const jaProgress = /^進捗を ([A-Z0-9_]+) から ([A-Z0-9_]+) に更新$/.exec(message)
  if (jaProgress) {
    return `進捗を「${enumLabel(jaProgress[1], SPONSORSHIP_PROGRESS_LABEL)}」から「${enumLabel(jaProgress[2], SPONSORSHIP_PROGRESS_LABEL)}」に更新`
  }
  const jaPhase = /^フェーズを ([A-Z0-9_]+) から ([A-Z0-9_]+) に更新$/.exec(message)
  if (jaPhase) {
    return `フェーズを「${enumLabel(jaPhase[1], SPONSORSHIP_PHASE_LABEL)}」から「${enumLabel(jaPhase[2], SPONSORSHIP_PHASE_LABEL)}」に更新`
  }
  const jaMenu = /^(.+)のステータスを ([A-Z0-9_]+) から ([A-Z0-9_]+) に更新$/.exec(
    message
  )
  if (jaMenu) {
    return `${jaMenu[1]}のステータスを「${enumLabel(jaMenu[2], CONTRACT_MENU_STATUS_LABEL)}」から「${enumLabel(jaMenu[3], CONTRACT_MENU_STATUS_LABEL)}」に更新`
  }
  return message
}
