package label

import "regexp"

// Japanese business labels for 活動記録 messages (spec/domain.md#Activity Log,
// spec/frontend.md Principle 2). Unknown codes are returned as-is.

var (
	reEnProgress     = regexp.MustCompile(`(?i)^Progress changed from ([A-Z0-9_]+) to ([A-Z0-9_]+)$`)
	reEnPhase        = regexp.MustCompile(`(?i)^Phase changed from ([A-Z0-9_]+) to ([A-Z0-9_]+)$`)
	reEnCompany      = regexp.MustCompile(`(?i)^Company status changed from ([A-Z0-9_]+) to ([A-Z0-9_]+)$`)
	reJaProgress     = regexp.MustCompile(`^進捗を ([A-Z0-9_]+) から ([A-Z0-9_]+) に更新$`)
	reJaProgressQ    = regexp.MustCompile(`^進捗を「([A-Z0-9_]+)」に更新$`)
	reJaCompany      = regexp.MustCompile(`^企業ステータスを ([A-Z0-9_]+) から ([A-Z0-9_]+) に更新$`)
	reJaPhase        = regexp.MustCompile(`^フェーズを ([A-Z0-9_]+) から ([A-Z0-9_]+) に更新$`)
	reJaMenuStatus   = regexp.MustCompile(`^(.+)のステータスを ([A-Z0-9_]+) から ([A-Z0-9_]+) に更新$`)
	reJaMenuSubmit   = regexp.MustCompile(`^協賛メニューのステータスを提出済みに更新$`)
)

// NormalizeActivityMessage maps legacy English / raw-enum messages onto
// Japanese business language. Already-Japanese messages are returned as-is.
func NormalizeActivityMessage(msg string) string {
	switch msg {
	case "Member assigned to YearlyCompany":
		return "担当メンバーを設定"
	case "Member assignment cleared", "Assignment cleared":
		return "担当メンバーを解除"
	}
	if m := reEnProgress.FindStringSubmatch(msg); m != nil {
		return StatusChange("進捗", Progress(m[1]), Progress(m[2]))
	}
	if m := reEnPhase.FindStringSubmatch(msg); m != nil {
		return StatusChange("フェーズ", Phase(m[1]), Phase(m[2]))
	}
	if m := reEnCompany.FindStringSubmatch(msg); m != nil {
		return StatusChange("企業ステータス", CompanyStatus(m[1]), CompanyStatus(m[2]))
	}
	if m := reJaProgress.FindStringSubmatch(msg); m != nil {
		return StatusChange("進捗", Progress(m[1]), Progress(m[2]))
	}
	if m := reJaProgressQ.FindStringSubmatch(msg); m != nil {
		return "進捗を「" + Progress(m[1]) + "」に更新"
	}
	if m := reJaCompany.FindStringSubmatch(msg); m != nil {
		return StatusChange("企業ステータス", CompanyStatus(m[1]), CompanyStatus(m[2]))
	}
	if m := reJaPhase.FindStringSubmatch(msg); m != nil {
		return StatusChange("フェーズ", Phase(m[1]), Phase(m[2]))
	}
	if m := reJaMenuStatus.FindStringSubmatch(msg); m != nil {
		return m[1] + "のステータスを「" + ContractMenuStatus(m[2]) + "」から「" + ContractMenuStatus(m[3]) + "」に更新"
	}
	if reJaMenuSubmit.MatchString(msg) {
		return "協賛メニューのステータスを「提出済み」に更新"
	}
	return msg
}

func Progress(code string) string {
	switch code {
	case "NOT_CONTACTED":
		return "未連絡"
	case "MATERIALS_SENT":
		return "資料送付"
	case "CONFIRMED":
		return "協賛確定"
	case "INVOICE_SENT":
		return "請求書送付"
	case "PAYMENT_RECEIVED":
		return "協賛金入金"
	case "RECEIPT_SENT":
		return "領収書送付"
	case "DECLINED":
		return "見送り"
	case "PENDING":
		return "保留"
	default:
		return code
	}
}

func CompanyStatus(code string) string {
	switch code {
	case "CONTINUING":
		return "継続"
	case "NEW":
		return "新規"
	case "DORMANT":
		return "休眠"
	default:
		return code
	}
}

func Phase(code string) string {
	switch code {
	case "PHASE_1":
		return "フェーズ1"
	case "PHASE_2":
		return "フェーズ2"
	case "PHASE_3":
		return "フェーズ3"
	case "PHASE_4":
		return "フェーズ4"
	default:
		return code
	}
}

func ContractMenuStatus(code string) string {
	switch code {
	case "WAITING":
		return "広告データ提出待ち"
	case "REQUESTED":
		return "制作依頼済み"
	case "PRODUCING":
		return "制作中"
	case "COMPLETED":
		return "完成"
	case "SUBMITTED":
		return "提出済み"
	default:
		return code
	}
}

func StatusChange(subject, from, to string) string {
	return subject + "を「" + from + "」から「" + to + "」に更新"
}
