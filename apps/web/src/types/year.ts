/**
 * Year (spec/model.md#Year) — one festival cycle. Only one Year is active
 * (isActive) at a time; every other business object is scoped to a Year.
 */
export type Year = {
  id: string
  name: string
  startDate: string
  endDate: string
  isActive: boolean
}
