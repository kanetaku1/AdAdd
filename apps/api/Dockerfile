FROM golang:alpine AS builder

WORKDIR /app


COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o server ./cmd/server && go build -o migrate ./cmd/migrate

FROM alpine:3.20

WORKDIR /app

COPY --from=builder /app/server .
COPY --from=builder /app/migrate .
COPY --from=builder /app/migrations ./migrations

EXPOSE 8080

CMD ["./server"]
