"use client"

import { useState } from "react"
import { pdf, PDFViewer } from "@react-pdf/renderer"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InvoiceDocument, type InvoiceData } from "@/lib/pdf/invoice-document"

/**
 * On-demand Invoice PDF generation (spec/requirements.md FR-015,
 * spec/usecase.md UC-17). Pre-filled from SponsorshipContract/ContractMenu/
 * Company data (passed in as initialData), editable here before download.
 * Rendered client-side via @react-pdf/renderer — no backend endpoint
 * involved (spec/architecture.md). Preview re-renders live via PDFViewer as
 * fields change; only the final "ダウンロード" click regenerates a Blob.
 */
export function InvoiceGeneratorModal({
  initialData,
  fileName,
}: {
  initialData: InvoiceData
  fileName: string
}) {
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<InvoiceData>(initialData)
  const [busy, setBusy] = useState(false)

  function set<K extends keyof InvoiceData>(key: K, value: InvoiceData[K]) {
    setData((prev) => ({ ...prev, [key]: value }))
  }

  async function handleDownload() {
    setBusy(true)
    try {
      const blob = await pdf(<InvoiceDocument data={data} />).toBlob()
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
      <DialogTrigger render={<Button variant="outline" />}>
        請求書を生成
      </DialogTrigger>
      <DialogContent className="max-w-4xl sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>請求書の生成</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FieldGroup className="max-h-[65vh] overflow-y-auto pr-2">
            <Field>
              <FieldLabel htmlFor="inv-companyName">企業名</FieldLabel>
              <Input
                id="inv-companyName"
                value={data.companyName}
                onChange={(e) => set("companyName", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="inv-subject">件名</FieldLabel>
              <Input
                id="inv-subject"
                value={data.subject}
                onChange={(e) => set("subject", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="inv-issuedDate">請求日</FieldLabel>
              <Input
                id="inv-issuedDate"
                type="date"
                value={data.issuedDate}
                onChange={(e) => set("issuedDate", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="inv-deadline">振込締切日</FieldLabel>
              <Input
                id="inv-deadline"
                type="date"
                value={data.deadline}
                onChange={(e) => set("deadline", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="inv-staffName">担当者名(実行委員)</FieldLabel>
              <Input
                id="inv-staffName"
                value={data.staffName}
                onChange={(e) => set("staffName", e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="inv-totalAmount">合計金額</FieldLabel>
              <Input
                id="inv-totalAmount"
                type="number"
                min={0}
                value={data.totalAmount}
                onChange={(e) =>
                  set("totalAmount", Number(e.target.value) || 0)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="inv-remark">備考</FieldLabel>
              <Textarea
                id="inv-remark"
                rows={3}
                value={data.remark}
                onChange={(e) => set("remark", e.target.value)}
              />
            </Field>
          </FieldGroup>

          <div className="flex flex-col gap-2">
            {open && (
              <PDFViewer
                style={{ width: "100%", height: "60vh", border: "none" }}
                showToolbar={false}
              >
                <InvoiceDocument data={data} />
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
