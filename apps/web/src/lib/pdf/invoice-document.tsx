import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer"

import {
  FESTIVAL_ADDRESS_LINE,
  FESTIVAL_ADDRESS_LINE2,
  FESTIVAL_BANK_ACCOUNT_HOLDER,
  FESTIVAL_BANK_ACCOUNT_NUMBER,
  FESTIVAL_BANK_ACCOUNT_TYPE,
  FESTIVAL_BANK_BRANCH,
  FESTIVAL_BANK_NAME,
  FESTIVAL_EMAIL,
  FESTIVAL_NAME,
  FESTIVAL_POSTAL_CODE,
} from "./constants"
import { ensureJapaneseFontRegistered, JAPANESE_FONT_FAMILY } from "./fonts"
import { formatDateSlashes } from "./format-date"

ensureJapaneseFontRegistered()

const MAX_CHARS_PER_LINE = 15

const styles = StyleSheet.create({
  page: {
    fontFamily: JAPANESE_FONT_FAMILY,
    padding: 30,
    fontSize: 11,
  },
  header: { fontSize: 24, textAlign: "center", marginBottom: 30 },
  text_S: { fontSize: 10 },
  text_M: { fontSize: 15 },
  text_L: { fontSize: 20 },
  details: { flexDirection: "row", marginBottom: 20 },
  leftColumn: { width: "55%", merginRight: 20 },
  rightColumn: { width: "45%", marginLeft: 40 },
  underline: {
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    borderBottomStyle: "solid",
    paddingBottom: 3,
  },
  companyRow: { flexDirection: "row", alignItems: "flex-end" },
  companyLines: { flexDirection: "column", flexGrow: 1 },
  marginBottom: { marginBottom: 8 },
  paddingTop: { paddingTop: 30 },
  sumField: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    width: 220,
    paddingTop: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 12,
  },
  tableRow: { flexDirection: "row" },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    textAlign: "center",
    padding: 5,
  },
  colNo: { width: "8%" },
  colName: { width: "42%" },
  colQty: { width: "12%" },
  colUnitPrice: { width: "19%" },
  colSubtotal: { width: "19%" },
  bankBox: {
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
    padding: 8,
    marginBottom: 12,
  },
  remarkBox: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
  },
  remarkHeader: {
    width: "15%",
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderColor: "#000",
    borderStyle: "solid",
  },
  remarkBody: { width: "85%", padding: 7 },
})

/** Wraps a company name onto multiple short lines so it fits the underlined name field. */
function wrapCompanyName(name: string): string[] {
  if (/[a-zA-Z]/.test(name)) {
    const words = name.split(" ")
    const lines: string[] = []
    let current = ""
    for (const word of words) {
      if (current.length === 0) {
        current = word
      } else if ((current + " " + word).length <= MAX_CHARS_PER_LINE) {
        current += " " + word
      } else {
        lines.push(current)
        current = word
      }
    }
    if (current.length > 0) lines.push(current)
    return lines.length > 0 ? lines : [" "]
  }
  const lines = name.match(new RegExp(`.{1,${MAX_CHARS_PER_LINE}}`, "g"))
  return lines && lines.length > 0 ? lines : [" "]
}

export type InvoiceLineItem = {
  name: string
  quantity: number
  unitPrice: number
}

/**
 * Data for the Invoice PDF (spec/requirements.md FR-015, spec/usecase.md
 * UC-17). Pre-filled from SponsorshipContract/ContractMenu/Company, editable
 * before download. totalAmount defaults to the sum of quantity * unitPrice
 * across items, but can be overridden here — this only affects the
 * generated document, not the underlying Contract data.
 */
export type InvoiceData = {
  companyName: string
  contactPersonName: string
  subject: string
  issuedDate: string
  deadline: string
  staffName: string
  remark: string
  items: InvoiceLineItem[]
  totalAmount: number
}

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const companyNameLines = wrapCompanyName(data.companyName || " ")

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>請　求　書</Text>

        <View style={styles.details}>
          <View style={styles.leftColumn}>
            <View style={[styles.underline, styles.companyRow, styles.marginBottom]}>
              <View style={styles.companyLines}>
                {companyNameLines.map((line, i) => (
                  <Text style={styles.text_M} key={i}>
                    {line}
                  </Text>
                ))}
              </View>
              <Text style={styles.text_M}>御中</Text>
            </View>

            <Text style={[styles.text_S, styles.underline, styles.marginBottom]}>
              件名 : <Text style={styles.text_M}>{data.subject}</Text>
            </Text>

            <Text style={[styles.text_S, styles.paddingTop]}>
              下記の通り、ご請求申し上げます。
            </Text>
            <View style={[styles.sumField, styles.underline]}>
              <Text style={styles.text_S}>
                合計金額{" "}
                <Text style={styles.text_L}>
                  ¥ {data.totalAmount.toLocaleString()}
                </Text>
              </Text>
            </View>
          </View>

          <View style={styles.rightColumn}>
            <Text style={styles.marginBottom}>
              請求日 : {formatDateSlashes(data.issuedDate)}
            </Text>
            <View style={styles.marginBottom}>
              <Text>{FESTIVAL_NAME}</Text>
              <Text>{FESTIVAL_POSTAL_CODE}</Text>
              <Text>{FESTIVAL_ADDRESS_LINE}</Text>
              <Text>{FESTIVAL_ADDRESS_LINE2}</Text>
            </View>
            <Text style={styles.text_S}>E-Mail : {FESTIVAL_EMAIL}</Text>
            <Text>担当 : {data.staffName}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Text style={[styles.cell, styles.colNo]}>No.</Text>
            <Text style={[styles.cell, styles.colName]}>概要</Text>
            <Text style={[styles.cell, styles.colQty]}>数量</Text>
            <Text style={[styles.cell, styles.colUnitPrice]}>単価</Text>
            <Text style={[styles.cell, styles.colSubtotal]}>金額</Text>
          </View>
          {data.items.map((item, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={[styles.cell, styles.colNo]}>{i + 1}</Text>
              <Text style={[styles.cell, styles.colName]}>{item.name}</Text>
              <Text style={[styles.cell, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.cell, styles.colUnitPrice]}>
                ¥ {item.unitPrice.toLocaleString()}
              </Text>
              <Text style={[styles.cell, styles.colSubtotal]}>
                ¥ {(item.quantity * item.unitPrice).toLocaleString()}
              </Text>
            </View>
          ))}
          <View style={styles.tableRow}>
            <Text style={[styles.cell, styles.colNo]} />
            <Text style={[styles.cell, styles.colName]} />
            <Text style={[styles.cell, styles.colQty]}>合計</Text>
            <Text style={[styles.cell, styles.colUnitPrice]} />
            <Text style={[styles.cell, styles.colSubtotal]}>
              ¥ {data.totalAmount.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.bankBox}>
          <Text style={styles.text_S}>
            お手数をおかけしますが、{formatDateSlashes(data.deadline)}
            までに下記口座へお振込みくださいますようお願い申し上げます。
          </Text>
          <Text style={styles.text_S}>&lt;振込先&gt;</Text>
          <Text style={styles.text_S}>銀 行 名 : {FESTIVAL_BANK_NAME}</Text>
          <Text style={styles.text_S}>支 店 名 : {FESTIVAL_BANK_BRANCH}</Text>
          <Text style={styles.text_S}>
            預金種別 : {FESTIVAL_BANK_ACCOUNT_TYPE}
          </Text>
          <Text style={styles.text_S}>
            口座番号 : {FESTIVAL_BANK_ACCOUNT_NUMBER}
          </Text>
          <Text style={styles.text_S}>
            口座名義 : {FESTIVAL_BANK_ACCOUNT_HOLDER}
          </Text>
        </View>

        <View style={styles.remarkBox}>
          <View style={styles.remarkHeader}>
            <Text>備考</Text>
          </View>
          <View style={styles.remarkBody}>
            <Text>振込手数料は、御社負担にてお願いいたします。</Text>
            {(data.remark.match(/.{1,40}/g) || []).map((chunk, i) => (
              <Text key={i}>{chunk}</Text>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  )
}
