/**
 * Business dates are calendar days in Japan (spec/architecture.md#Time Zone).
 * Never derive one with `Date.toISOString()`: that is the UTC day, so between
 * 0:00 and 9:00 JST it is the previous day (Issue #160).
 */
const BUSINESS_TIME_ZONE = "Asia/Tokyo"

const businessDateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** The JST calendar day (`YYYY-MM-DD`) of an instant. */
export function toBusinessDate(instant: Date): string {
  const parts = businessDateFormat.formatToParts(instant)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")}`
}

/** Today in JST (`YYYY-MM-DD`), whatever the browser's time zone. */
export function businessToday(): string {
  return toBusinessDate(new Date())
}

/** Adds calendar days to a business date (`YYYY-MM-DD`). */
export function addBusinessDays(businessDate: string, days: number): string {
  const [year, month, day] = businessDate.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10)
}
