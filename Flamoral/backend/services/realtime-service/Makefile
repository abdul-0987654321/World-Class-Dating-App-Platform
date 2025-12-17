.PHONY: build run test clean docker-build docker-run lint fmt

# Build variables
BINARY_NAME=realtime-service
DOCKER_IMAGE=heartly/realtime-service
VERSION=$(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")

# Go variables
GOCMD=go
GOBUILD=$(GOCMD) build
GOTEST=$(GOCMD) test
GOCLEAN=$(GOCMD) clean
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod
GOFMT=gofmt
GOLINT=golangci-lint

# Build flags
LDFLAGS=-ldflags "-w -s -X main.version=$(VERSION)"

## build: Build the binary
build:
	$(GOBUILD) $(LDFLAGS) -o $(BINARY_NAME) ./cmd/server

## run: Run the service
run:
	$(GOCMD) run ./cmd/server

## test: Run tests
test:
	$(GOTEST) -v -race -cover ./...

## test-coverage: Run tests with coverage report
test-coverage:
	$(GOTEST) -v -race -coverprofile=coverage.out ./...
	$(GOCMD) tool cover -html=coverage.out -o coverage.html

## clean: Clean build files
clean:
	$(GOCLEAN)
	rm -f $(BINARY_NAME)
	rm -f coverage.out coverage.html

## lint: Run linter
lint:
	$(GOLINT) run ./...

## fmt: Format code
fmt:
	$(GOFMT) -s -w .

## tidy: Tidy go modules
tidy:
	$(GOMOD) tidy

## download: Download dependencies
download:
	$(GOMOD) download

## docker-build: Build Docker image
docker-build:
	docker build -t $(DOCKER_IMAGE):$(VERSION) -t $(DOCKER_IMAGE):latest .

## docker-run: Run Docker container
docker-run:
	docker run -p 8081:8081 \
		-e REDIS_HOST=host.docker.internal \
		-e JWT_SECRET=your-secret-key \
		$(DOCKER_IMAGE):latest

## docker-push: Push Docker image
docker-push:
	docker push $(DOCKER_IMAGE):$(VERSION)
	docker push $(DOCKER_IMAGE):latest

## dev: Run in development mode with hot reload
dev:
	@which air > /dev/null 2>&1 || go install github.com/cosmtrek/air@latest
	air

## help: Show this help
help:
	@echo "Available targets:"
	@sed -n 's/^##//p' $(MAKEFILE_LIST) | column -t -s ':' | sed -e 's/^/ /'

# Default target
.DEFAULT_GOAL := help
