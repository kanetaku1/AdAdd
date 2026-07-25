package model

type BulkError struct {
	RowNumber int    `json:"rowNumber"`
	Message   string `json:"message"`
}

type BulkResult struct {
	TotalCount     int           `json:"totalCount"`
	SuccessCount   int           `json:"successCount"`
	ErrorCount     int           `json:"errorCount"`
	SuccessfulRows []interface{} `json:"successfulRows"`
	Errors         []BulkError   `json:"errors"`
}
