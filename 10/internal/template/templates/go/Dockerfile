FROM golang:{{.GoVersion}}-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/main .

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/main .
COPY .env .

EXPOSE {{.AppPort}}

CMD ["./main"]
