import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { mockCompanies } from "@/lib/mock/companies"

/**
 * Company List (spec/frontend.md#Company Management).
 * Manages permanent Company master data — independent of festival years.
 * TODO: replace mockCompanies with GET /companies once the backend endpoint exists (spec/api.md).
 */
export default function CompaniesPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Companies</h1>
          <p className="text-muted-foreground">企業マスタの管理</p>
        </div>
        <Button render={<Link href="/companies/new" />}>企業を登録</Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>会社名</TableHead>
              <TableHead>企業担当者</TableHead>
              <TableHead>連絡先</TableHead>
              <TableHead>電話番号 / 住所</TableHead>
              <TableHead>協賛開始年度</TableHead>
              <TableHead>メモ</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockCompanies.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">
                  {company.companyName}
                  <div className="text-xs text-muted-foreground">
                    {company.companyNameKana}
                  </div>
                </TableCell>
                <TableCell>{company.contactPersonName}</TableCell>
                <TableCell>
                  {company.contactEmailOrForm.startsWith("http") ? (
                    <a
                      href={company.contactEmailOrForm}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      問い合わせフォーム
                    </a>
                  ) : (
                    company.contactEmailOrForm
                  )}
                </TableCell>
                <TableCell>
                  <div>{company.phoneNumber}</div>
                  <div className="text-xs text-muted-foreground">
                    {company.address}
                  </div>
                </TableCell>
                <TableCell>{company.firstSponsorshipYear}</TableCell>
                <TableCell className="max-w-48">
                  <div
                    className="line-clamp-2 text-sm text-muted-foreground"
                    title={company.memo || undefined}
                  >
                    {company.memo || "-"}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    render={<Link href={`/companies/${company.id}`} />}
                  >
                    編集
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
