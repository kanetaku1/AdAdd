/**
 * Shared CSV bulk-import result (spec/api.md#Bulk Import Users /
 * #Bulk Import Companies, apps/api/internal/model/bulk.go).
 */

export type BulkError = {
  rowNumber: number
  message: string
}

export type BulkResult<T> = {
  totalCount: number
  successCount: number
  errorCount: number
  successfulRows: T[]
  errors: BulkError[]
}
