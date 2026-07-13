"use client"

import { useState } from "react"
import { pdf, PDFViewer } from "@react-pdf/renderer"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { ReceiptDocument, type ReceiptData } from "@/lib/pdf/receipt-document"

/**
 * On-demand Receipt PDF generation (spec/requirements.md FR-015,
 * spec/usecase.md UC-10). Pre-filled from a confirmed Payment/Company, but
 * every field here is manually editable — companyName/issuedDate/
 * paymentDate/amount are fill-in-the-blank fields on a real paper receipt,
 * not values AdAdd can guarantee are final. 但し書き is fixed
 * ("技大祭への協賛として", see ReceiptDocument) and not editable.
 */
export function ReceiptGeneratorModal({
  initialData,
  fileName,
}: {
  initialData: ReceiptData
  fileName: string
}) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<ReceiptData>(initialData)
  const [busy, setBusy] = useState(false)

  function set<K extends keyof ReceiptData>(key: K, value: ReceiptData[K]) {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  async function handleDownload() {
    setBusy(true)
    try {
      const blob = await pdf(<ReceiptDocument data={data} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        領収書を生成
      </DialogTrigger>
      <DialogContent className="max-w-4xl sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>領収書の生成</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FieldGroup className="max-h-[65vh] overflow-y-auto pr-2">
            <Field>
              <FieldLabel htmlFor="rcpt-companyName">会社名</FieldLabel>
              <Input
                id="rcpt-companyName"
                value={data.companyName}
                onChange={(e) => set("companyName", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="rcpt-amount">金額</FieldLabel>
              <Input
                id="rcpt-amount"
                type="number"
                min={0}
                value={data.amount}
                onChange={(e) => set("amount", Number(e.target.value) || 0)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="rcpt-issuedDate">発行日</FieldLabel>
              <Input
                id="rcpt-issuedDate"
                type="date"
                value={data.issuedDate}
                onChange={(e) => set("issuedDate", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="rcpt-paymentDate">入金日</FieldLabel>
              <Input
                id="rcpt-paymentDate"
                type="date"
                value={data.paymentDate}
                onChange={(e) => set("paymentDate", e.target.value)}
              />
            </Field>
          </FieldGroup>

          <div className="flex flex-col gap-2">
            {open && (
              <PDFViewer
                style={{ width: "100%", height: "40vh", border: "none" }}
                showToolbar={false}
              >
                <ReceiptDocument data={data} />
              </PDFViewer>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleDownload} disabled={busy}>
            ダウンロード
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
