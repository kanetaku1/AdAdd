FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY . .
RUN go mod download
RUN go build -o server ./cmd/server

FROM alpine:3.20

WORKDIR /app

COPY --from=builder /app/server .

EXPOSE 8080

CMD ["./server"]
