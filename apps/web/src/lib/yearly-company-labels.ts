import type {
  CompanyStatus,
  SponsorshipPhase,
  SponsorshipProgress,
} from "@/types/yearly-company"

/**
 * UI Design Principle 2 (spec/frontend.md): show business language, not raw enum values.
 */
export const COMPANY_STATUS_LABEL: Record<CompanyStatus, string> = {
  CONTINUING: "継続",
  NEW: "新規",
  DORMANT: "休眠",
}

export const SPONSORSHIP_PHASE_LABEL: Record<SponsorshipPhase, string> = {
  PHASE_1: "フェーズ1",
  PHASE_2: "フェーズ2",
  PHASE_3: "フェーズ3",
  PHASE_4: "フェーズ4",
}

export const SPONSORSHIP_PROGRESS_LABEL: Record<SponsorshipProgress, string> = {
  NOT_CONTACTED: "未連絡",
  MATERIALS_SENT: "資料送付",
  CONFIRMED: "協賛確定",
  INVOICE_SENT: "請求書送付",
  PAYMENT_RECEIVED: "協賛金入金",
  RECEIPT_SENT: "領収書送付",
  DECLINED: "見送り",
  PENDING: "保留",
}

/**
 * shadcn Badge variant per Sponsorship Phase. Phase1 is the highest outreach
 * priority and Phase4 the lowest (spec/model.md#SponsorshipPhase), so the
 * badges fade from solid to faint. No phase uses the error color: a low
 * priority is not a problem.
 */
export const SPONSORSHIP_PHASE_BADGE_VARIANT: Record<
  SponsorshipPhase,
  "default" | "secondary" | "outline"
> = {
  PHASE_1: "default",
  PHASE_2: "secondary",
  PHASE_3: "outline",
  PHASE_4: "outline",
}

/** Extra badge classes per Sponsorship Phase — Phase4 is the faintest. */
export const SPONSORSHIP_PHASE_BADGE_CLASS_NAME: Record<SponsorshipPhase, string> = {
  PHASE_1: "",
  PHASE_2: "",
  PHASE_3: "",
  PHASE_4: "border-dashed text-muted-foreground",
}

/**
 * shadcn Badge variant per Sponsorship Progress — NOT_CONTACTED/PENDING are
 * the stages a Member/Advisor needs to act on next (spec/frontend.md#Dashboard),
 * DECLINED is terminal with nothing left to do, everything else is normal
 * in-progress flow.
 */
export const SPONSORSHIP_PROGRESS_BADGE_VARIANT: Record<
  SponsorshipProgress,
  "default" | "secondary" | "outline" | "destructive"
> = {
  NOT_CONTACTED: "destructive",
  MATERIALS_SENT: "secondary",
  CONFIRMED: "secondary",
  INVOICE_SENT: "secondary",
  PAYMENT_RECEIVED: "secondary",
  RECEIPT_SENT: "secondary",
  DECLINED: "outline",
  PENDING: "destructive",
}
