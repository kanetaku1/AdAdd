import { expect, test } from "@playwright/test"

import { addBusinessDays, toBusinessDate } from "./business-date"
import { toConfirmationDate } from "./payment-labels"

test.describe("toBusinessDate", () => {
  test("00:30 JST is already the JST day, not the previous UTC day (Issue #160)", () => {
    expect(toBusinessDate(new Date("2026-11-03T15:30:00Z"))).toBe("2026-11-04")
  })

  test("09:00 JST and 23:59 JST are the same JST day", () => {
    expect(toBusinessDate(new Date("2026-11-04T00:00:00Z"))).toBe("2026-11-04")
    expect(toBusinessDate(new Date("2026-11-04T14:59:00Z"))).toBe("2026-11-04")
  })

  test("00:00 JST starts the next day", () => {
    expect(toBusinessDate(new Date("2026-11-04T15:00:00Z"))).toBe("2026-11-05")
  })
})

test.describe("addBusinessDays", () => {
  test("adds calendar days across a month and a year end", () => {
    expect(addBusinessDays("2026-11-04", 14)).toBe("2026-11-18")
    expect(addBusinessDays("2026-11-20", 14)).toBe("2026-12-04")
    expect(addBusinessDays("2026-12-25", 14)).toBe("2027-01-08")
  })
})

test.describe("toConfirmationDate", () => {
  test("is the JST day of the confirmation instant", () => {
    expect(toConfirmationDate("2026-11-03T15:30:00Z")).toBe("2026-11-04")
  })

  test("keeps a plain date and rejects missing values", () => {
    expect(toConfirmationDate("2026-11-04")).toBe("2026-11-04")
    expect(toConfirmationDate(null)).toBeNull()
  })
})
