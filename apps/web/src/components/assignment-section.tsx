"use client"

import { Badge } from "@/components/ui/badge"
import { AssignedMemberCell } from "@/components/assigned-member-cell"
import { EditableCompanyStatusBadge } from "@/components/editable-company-status-badge"
import { EditableProgressBadge } from "@/components/editable-progress-badge"
import { EditableSponsorshipPhaseBadge } from "@/components/editable-sponsorship-phase-badge"
import type { User } from "@/types/user"
import type {
  CompanyStatus,
  SponsorshipPhase,
  SponsorshipProgress,
} from "@/types/yearly-company"

/**
 * Assignment (担当) strip on Yearly Company Detail
 * (spec/frontend.md#Yearly Company Detail → Assignment). Compact: assigned
 * member, advisors, company status, phase, and progress in one row.
 *
 * Advisors are derived client-side from the assigned member's
 * AdvisorAssignments and are not editable here — Settings > Advisor
 * Assignments owns that.
 */
export function AssignmentSection({
  assignedMemberId,
  assignedMemberName,
  advisorNames,
  users,
  onAssign,
  assignDisabled,
  companyStatus,
  onCompanyStatusChange,
  phase,
  onPhaseChange,
  progress,
  onProgressChange,
  statusPhaseProgressDisabled,
}: {
  assignedMemberId: string | null
  assignedMemberName: string | null
  advisorNames: string[]
  users: User[]
  onAssign: (userId: string | null) => void
  assignDisabled?: boolean
  companyStatus: CompanyStatus
  onCompanyStatusChange: (companyStatus: CompanyStatus) => void
  phase: SponsorshipPhase
  onPhaseChange: (phase: SponsorshipPhase) => void
  progress: SponsorshipProgress
  onProgressChange: (progress: SponsorshipProgress) => void
  statusPhaseProgressDisabled?: boolean
}) {
  return (
    <section
      aria-label="担当"
      className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-md border px-4 py-3 text-sm"
    >
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">担当</span>
        <AssignedMemberCell
          assignedMemberId={assignedMemberId}
          assignedMemberName={assignedMemberName}
          users={users}
          onChange={onAssign}
          disabled={assignDisabled}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">アドバイザー</span>
        {!assignedMemberId ? (
          <span className="text-muted-foreground">担当メンバー未割当</span>
        ) : advisorNames.length === 0 ? (
          <span
            className="text-muted-foreground"
            title="設定画面のアドバイザー割当で行います"
          >
            未設定
          </span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {advisorNames.map((name, i) => (
              <Badge key={i} variant="outline">
                {name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">企業ステータス</span>
        <EditableCompanyStatusBadge
          value={companyStatus}
          onChange={onCompanyStatusChange}
          disabled={statusPhaseProgressDisabled}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">フェーズ</span>
        <EditableSponsorshipPhaseBadge
          value={phase}
          onChange={onPhaseChange}
          disabled={statusPhaseProgressDisabled}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">進捗</span>
        <EditableProgressBadge
          value={progress}
          onChange={onProgressChange}
          disabled={statusPhaseProgressDisabled}
        />
      </div>
    </section>
  )
}
