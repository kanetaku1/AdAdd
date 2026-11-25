/**
 * ContractMenuProductionType (spec/model.md#Enumerations).
 * Only applies when the referenced Sponsorship Menu has requiresSubmission
 * = true; null for menus like Booth that never require submission.
 */
export type ContractMenuProductionType = "COMPANY" | "INTERNAL" | "CONTINUED"

export type ContractMenuProductionDepartment =
  | "DOCUMENT_CREATION_DEPARTMENT"
  | "PRODUCTION_BUREAU"
  | "SOCIAL_MEDIA_DEPARTMENT"

/**
 * ContractMenuStatus (spec/model.md#Enumerations).
 */
export type ContractMenuStatus =
  | "WAITING"
  | "PROVISIONAL_SUBMITTED"
  | "MATERIAL_COMPLETED"
  | "REQUESTED"
  | "COMPANY_REVIEWING"
  | "PRODUCING"
  | "COMPLETED"
  | "SUBMITTED"

export type ContractMenuReviewItemResult =
  | "PASS"
  | "FAIL"
  | "NOT_APPLICABLE"

export type ContractMenuDriveFile = {
  id: string
  contractMenuId: string
  submissionId?: string | null
  uploadedById?: string | null
  driveFileId: string | null
  driveUrl: string
  driveFileName: string
  createdAt?: string
  updatedAt?: string
}

export type ContractMenuSubmissionSummary = {
  id: string
  contractMenuId: string
  kind: "AD_DATA" | "MATERIAL" | "FINAL_DATA"
  sequence: number
  submittedById: string | null
  submittedAt: string
  reviewedById: string | null
  reviewedAt: string | null
  reviewStatus: "PENDING" | "APPROVED" | "CHANGES_REQUESTED"
}

export type ContractMenuChecklistItem = {
  code: string
  label: string
  description: string
}

export type ContractMenuFileReviewItem = {
  id: string
  reviewId: string
  itemCode: string
  label: string
  result: ContractMenuReviewItemResult
  createdAt: string
}

export type ContractMenuFileReview = {
  id: string
  submissionId: string
  fileId: string
  reviewerId: string | null
  result: "APPROVED" | "CHANGES_REQUESTED"
  reviewedAt: string
  items: ContractMenuFileReviewItem[]
}

export type ContractMenuSubmission = ContractMenuSubmissionSummary & {
  files: ContractMenuDriveFile[]
  reviews: ContractMenuFileReview[]
}

export type ContractMenuWorkflowEvent = {
  id: string
  contractMenuId: string
  submissionId: string | null
  fileId: string | null
  eventType: string
  actorId: string | null
  actorName: string | null
  details: Record<string, unknown> | null
  createdAt: string
}

export type ContractMenuReviewWorkflow = {
  checklist: ContractMenuChecklistItem[]
  submissions: ContractMenuSubmission[]
  events: ContractMenuWorkflowEvent[]
}

export type ContractMenuReviewResult = {
  status: ContractMenuStatus
  slackDelivery: {
    status: "SENT" | "SKIPPED" | "FAILED" | "NOT_REQUIRED"
    reason?: string
  }
  workflow: ContractMenuReviewWorkflow
}

/**
 * ContractMenu (spec/model.md#ContractMenu) — one Sponsorship Menu a company
 * has actually contracted for, as part of a Sponsorship Contract.
 * unitPrice defaults from SponsorshipMenu.defaultPrice but may be overridden.
 *
 * isGoodsSponsorship marks this line as a free return for goods sponsorship
 * (物品協賛) rather than a paid item (unitPrice is conventionally 0 when
 * true). This is a per-ContractMenu flag, not a property of the referenced
 * SponsorshipMenu — the same menu (e.g. a Pamphlet ad) can be sold normally
 * in one contract and given as a goods-sponsorship return in another. The
 * goods received (description, estimated value) are recorded in
 * SponsorshipContract.remarks, not here (spec/domain.md#Contract Menu >
 * Goods Sponsorship).
 */
export type ContractMenu = {
  id: string
  contractId: string
  sponsorshipMenuId: string
  quantity: number
  unitPrice: number
  isGoodsSponsorship: boolean
  productionType: ContractMenuProductionType | null
  productionDepartment: ContractMenuProductionDepartment | null
  status: ContractMenuStatus
  driveFolderId: string | null
  files: ContractMenuDriveFile[]
  fileCount: number
  isSubmitted: boolean
  allowUpload: boolean
  allowDelete: boolean
  allowReview?: boolean
  allowStatusChange?: boolean
  currentSubmission?: ContractMenuSubmissionSummary | null
  reviewIndicator?: "NONE" | "UNREVIEWED" | "REVIEWED"
  /** Deprecated read-only compatibility fields for the first active file. */
  driveUrl: string | null
  driveFileName: string | null
  remarks: string
}

/**
 * ContractMenu joined with its owning Company/Sponsorship Menu for
 * cross-contract views (spec/frontend.md#Contract Menu List, #Ad Material
 * Progress) — see `GET /years/{yearId}/contract-menus` in spec/api.md.
 */
export type ContractMenuAcrossYear = ContractMenu & {
  companyName: string
  yearlyCompanyId: string
  assignedMemberId: string | null
  assignedMemberName: string | null
  sponsorshipMenuName: string
}
