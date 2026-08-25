/**
 * CSV helpers for bulk import / list export
 * (`spec/frontend.md#CSV Import / Export`). Import templates use exact API
 * header names. Export uses Japanese labels. UTF-8 with BOM.
 */

export function parseCsv(text: string): string[][] {
  const input = text.replace(/^\uFEFF/, "")
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < input.length; i++) {
    const c = input[i]
    if (inQuotes) {
      if (c === '"') {
        if (input[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
      continue
    }
    if (c === '"') {
      inQuotes = true
      continue
    }
    if (c === ",") {
      row.push(field)
      field = ""
      continue
    }
    if (c === "\n") {
      if (field.endsWith("\r")) field = field.slice(0, -1)
      row.push(field)
      rows.push(row)
      row = []
      field = ""
      continue
    }
    field += c
  }
  if (field.endsWith("\r")) field = field.slice(0, -1)
  if (inQuotes || field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  while (rows.length > 0 && rows[rows.length - 1].every((cell) => cell.trim() === "")) {
    rows.pop()
  }
  return rows
}

export function csvCell(
  record: string[],
  headerMap: Map<string, number>,
  header: string
): string {
  const index = headerMap.get(header)
  if (index === undefined || index >= record.length) return ""
  return record[index].trim()
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function downloadCsv(
  fileName: string,
  headers: string[],
  rows: string[][]
): void {
  const body = [headers, ...rows]
    .map((line) => line.map(escapeCsvField).join(","))
    .join("\r\n")
  const blob = new Blob(["\uFEFF" + body + "\r\n"], {
    type: "text/csv;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadCsvTemplate(
  fileName: string,
  headers: string[],
  exampleRow: string[]
): void {
  downloadCsv(fileName, headers, [exampleRow])
}
