/** Formats a yyyy-mm-dd date string (from an <input type="date">) as yyyy/mm/dd for display in PDFs. */
export function formatDateSlashes(dateStr: string): string {
  return dateStr.replaceAll("-", "/")
}
