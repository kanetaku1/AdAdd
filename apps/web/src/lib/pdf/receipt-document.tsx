import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer"

import {
  FESTIVAL_ADDRESS_LINE,
  FESTIVAL_ADDRESS_LINE2,
  FESTIVAL_EMAIL,
  FESTIVAL_NAME,
  FESTIVAL_POSTAL_CODE,
} from "./constants"
import { ensureJapaneseFontRegistered, JAPANESE_FONT_FAMILY } from "./fonts"
import { formatDateSlashes } from "./format-date"

ensureJapaneseFontRegistered()

/** Fixed per spec/usecase.md UC-10 — always "技大祭への協賛として", not editable per-generation. */
const DESCRIPTION = "技大祭への協賛として"

const styles = StyleSheet.create({
  page: {
    fontFamily: JAPANESE_FONT_FAMILY,
    fontSize: 10,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  title: { fontSize: 22 },
  section: { marginBottom: 8 },
  companyRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 8,
    paddingRight: 110,
  },
  amountBox: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: "#dde6f1",
  },
  amountName: { fontSize: 14 },
  amount: { fontSize: 18 },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  detailRow: { flexDirection: "row", gap: 16, marginBottom: 4 },
  stamp: { width: 90, position: "absolute", top: 40, right: 20 },
  /** Visually marks a manually-editable value, like a fill-in-the-blank paper form. */
  underline: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    borderBottomStyle: "solid",
    paddingBottom: 1,
    minWidth: 90,
  },
})

/**
 * Data for the Receipt PDF (spec/requirements.md FR-015, spec/usecase.md
 * UC-10). Pre-filled from Payment/Company but always editable — companyName,
 * issuedDate, paymentDate, and amount are the fields a real paper receipt
 * has as fill-in-the-blank entries, so they are rendered underlined here.
 *
 * issuedDate: when this receipt document is issued (発行日).
 * paymentDate: Payment.confirmedAt — the payment confirmation date, not
 * necessarily the bank transfer date (see spec/model.md#Payment) (入金日).
 * Both are yyyy-mm-dd and rendered as yyyy/mm/dd.
 */
export type ReceiptData = {
  companyName: string
  issuedDate: string
  paymentDate: string
  amount: number
}

export function ReceiptDocument({ data }: { data: ReceiptData }) {
  return (
    <Document>
      <Page size={{ width: 520, height: 260 }} style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>領　収　書</Text>
          <View style={styles.detailRow}>
            <Text>発行日</Text>
            <Text>{formatDateSlashes(data.issuedDate)}</Text>
          </View>
        </View>

        <Image style={styles.stamp} src="/images/43rd_Stamp.png" />

        <View style={styles.companyRow}>
          <Text style={[styles.underline, { fontSize: 15, flexGrow: 1 }]}>
            {data.companyName}
          </Text>
          <Text style={{ fontSize: 15 }}>御中</Text>
        </View>

        <View style={styles.section}>
          <Text>下記、正に徴収いたしました。</Text>
        </View>

        <View style={[styles.amountBox, styles.underline]}>
          <Text style={styles.amountName}>金額</Text>
          <Text style={styles.amount}>
            {"　¥ " + data.amount.toLocaleString()}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <View>
            <View style={styles.detailRow}>
              <Text>但し　</Text>
              <Text style={styles.underline}>{DESCRIPTION}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text>入金日</Text>
              <Text style={styles.underline}>
                {formatDateSlashes(data.paymentDate)}
              </Text>
            </View>
          </View>

          <View>
            <Text>{FESTIVAL_NAME}</Text>
            <Text>{FESTIVAL_POSTAL_CODE}</Text>
            <Text>{FESTIVAL_ADDRESS_LINE}</Text>
            <Text>{FESTIVAL_ADDRESS_LINE2}</Text>
            <Text>E-Mail : {FESTIVAL_EMAIL}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
