# Flamoral Dating Platform - Docker Makefile
# Convenience commands for Docker operations

.PHONY: help build push deploy dev-start dev-stop health clean

# Default target
.DEFAULT_GOAL := help

# Variables
TAG ?= latest
REGISTRY ?= flamoral.azurecr.io
ENV ?= dev
SERVICE ?=

help: ## Show this help message
	@echo "Flamoral Dating Platform - Docker Commands"
	@echo ""
	@echo "Usage: make [target] [VARIABLE=value]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'
	@echo ""
	@echo "Variables:"
	@echo "  TAG        Docker image tag (default: latest)"
	@echo "  REGISTRY   Docker registry (default: flamoral.azurecr.io)"
	@echo "  ENV        Environment (dev, staging, prod)"
	@echo "  SERVICE    Specific service name"
	@echo ""
	@echo "Examples:"
	@echo "  make build TAG=v1.0.0"
	@echo "  make push TAG=v1.0.0"
	@echo "  make deploy ENV=staging TAG=v1.0.0"
	@echo "  make dev-start"

build: ## Build all Docker images
	@echo "Building all images with tag: $(TAG)"
	./build-all.sh --tag $(TAG) --registry $(REGISTRY)

build-no-cache: ## Build all Docker images without cache
	@echo "Building all images (no cache) with tag: $(TAG)"
	./build-all.sh --tag $(TAG) --registry $(REGISTRY) --no-cache

build-parallel: ## Build all Docker images in parallel
	@echo "Building all images in parallel with tag: $(TAG)"
	./build-all.sh --tag $(TAG) --registry $(REGISTRY) --parallel

build-service: ## Build specific service (requires SERVICE=name)
ifndef SERVICE
	@echo "Error: SERVICE variable is required"
	@echo "Usage: make build-service SERVICE=api-gateway TAG=v1.0.0"
	@exit 1
endif
	@echo "Building $(SERVICE) with tag: $(TAG)"
	docker build -t $(REGISTRY)/$(SERVICE):$(TAG) \
		-f ../../backend/services/$(SERVICE)/Dockerfile \
		../..

push: ## Push all images to registry
	@echo "Pushing all images to registry: $(REGISTRY)"
	./push-all.sh --tag $(TAG) --acr-server $(REGISTRY)

push-dry-run: ## Dry run of push operation
	@echo "Dry run: Showing what would be pushed"
	./push-all.sh --tag $(TAG) --acr-server $(REGISTRY) --dry-run

push-service: ## Push specific service (requires SERVICE=name)
ifndef SERVICE
	@echo "Error: SERVICE variable is required"
	@echo "Usage: make push-service SERVICE=api-gateway TAG=v1.0.0"
	@exit 1
endif
	@echo "Pushing $(SERVICE) to registry"
	docker push $(REGISTRY)/$(SERVICE):$(TAG)

deploy: ## Deploy to environment
	@echo "Deploying to $(ENV) with tag: $(TAG)"
	./deploy.sh --env $(ENV) --tag $(TAG) --registry $(REGISTRY)

deploy-service: ## Deploy specific service (requires SERVICE=name)
ifndef SERVICE
	@echo "Error: SERVICE variable is required"
	@echo "Usage: make deploy-service SERVICE=api-gateway ENV=staging TAG=v1.0.0"
	@exit 1
endif
	@echo "Deploying $(SERVICE) to $(ENV)"
	./deploy.sh --env $(ENV) --service $(SERVICE) --tag $(TAG) --registry $(REGISTRY)

dev-start: ## Start local development environment
	@echo "Starting local development environment"
	./dev-start.sh

dev-start-build: ## Start local development with build
	@echo "Building and starting local development environment"
	./dev-start.sh --build

dev-start-service: ## Start specific service in dev (requires SERVICE=name)
ifndef SERVICE
	@echo "Error: SERVICE variable is required"
	@echo "Usage: make dev-start-service SERVICE=api-gateway"
	@exit 1
endif
	@echo "Starting $(SERVICE) in development mode"
	./dev-start.sh --service $(SERVICE)

dev-stop: ## Stop local development environment
	@echo "Stopping local development environment"
	./dev-stop.sh

dev-stop-clean: ## Stop and remove all volumes
	@echo "Stopping and cleaning local development environment"
	./dev-stop.sh --clean

dev-restart: dev-stop dev-start ## Restart local development environment

dev-logs: ## Show logs from all services
	docker-compose -f docker-compose.yml logs -f

dev-logs-service: ## Show logs from specific service (requires SERVICE=name)
ifndef SERVICE
	@echo "Error: SERVICE variable is required"
	@echo "Usage: make dev-logs-service SERVICE=api-gateway"
	@exit 1
endif
	docker-compose -f docker-compose.yml logs -f $(SERVICE)

health: ## Check health of all services
	@echo "Checking health of all services"
	./health-check.sh

health-service: ## Check health of specific service (requires SERVICE=name)
ifndef SERVICE
	@echo "Error: SERVICE variable is required"
	@echo "Usage: make health-service SERVICE=api-gateway"
	@exit 1
endif
	./health-check.sh --service $(SERVICE)

ps: ## Show running containers
	docker-compose -f docker-compose.yml ps

clean: ## Remove all stopped containers and dangling images
	@echo "Cleaning up Docker resources"
	docker-compose -f docker-compose.yml down
	docker system prune -f

clean-all: ## Remove all containers, volumes, and images
	@echo "WARNING: This will remove ALL Docker resources!"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read
	docker-compose -f docker-compose.yml down -v
	docker system prune -af --volumes

shell-service: ## Open shell in running service (requires SERVICE=name)
ifndef SERVICE
	@echo "Error: SERVICE variable is required"
	@echo "Usage: make shell-service SERVICE=api-gateway"
	@exit 1
endif
	docker-compose -f docker-compose.yml exec $(SERVICE) /bin/sh

db-shell: ## Open PostgreSQL shell
	docker-compose -f docker-compose.yml exec postgres psql -U flamoral -d flamoral

redis-shell: ## Open Redis CLI
	docker-compose -f docker-compose.yml exec redis redis-cli

mongo-shell: ## Open MongoDB shell
	docker-compose -f docker-compose.yml exec mongodb mongosh

test: ## Run tests in all services
	@echo "Running tests..."
	# Add test commands here

lint: ## Run linting on all services
	@echo "Running linting..."
	# Add lint commands here

format: ## Format code in all services
	@echo "Formatting code..."
	# Add format commands here

version: ## Show version information
	@echo "Docker version:"
	@docker --version
	@echo "Docker Compose version:"
	@docker-compose --version
	@echo "Kubernetes version:"
	@kubectl version --client 2>/dev/null || echo "kubectl not installed"
	@echo "Azure CLI version:"
	@az --version | head -n 1 2>/dev/null || echo "Azure CLI not installed"

env-check: ## Check if all required environment variables are set
	@echo "Checking environment variables..."
	@test -f .env && echo "✓ .env file exists" || echo "✗ .env file not found (copy from .env.example)"
	@test -n "$$JWT_SECRET" && echo "✓ JWT_SECRET is set" || echo "✗ JWT_SECRET not set"
	@test -n "$$POSTGRES_PASSWORD" && echo "✓ POSTGRES_PASSWORD is set" || echo "✗ POSTGRES_PASSWORD not set"
	@test -n "$$REDIS_PASSWORD" && echo "✓ REDIS_PASSWORD is set" || echo "✗ REDIS_PASSWORD not set"

backup-volumes: ## Backup Docker volumes
	@echo "Backing up Docker volumes..."
	@mkdir -p backups
	@docker-compose -f docker-compose.yml exec -T postgres pg_dumpall -U flamoral > backups/postgres_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✓ PostgreSQL backup created"

restore-volumes: ## Restore Docker volumes from backup (requires BACKUP_FILE=path)
ifndef BACKUP_FILE
	@echo "Error: BACKUP_FILE variable is required"
	@echo "Usage: make restore-volumes BACKUP_FILE=backups/postgres_20240101_120000.sql"
	@exit 1
endif
	@echo "Restoring from $(BACKUP_FILE)..."
	@cat $(BACKUP_FILE) | docker-compose -f docker-compose.yml exec -T postgres psql -U flamoral
	@echo "✓ Restore completed"

update-images: ## Pull latest images from registry
	@echo "Pulling latest images..."
	docker-compose -f docker-compose.yml pull

stats: ## Show resource usage statistics
	docker stats --no-stream

info: ## Show system information
	@echo "=== Docker Info ==="
	@docker info
	@echo ""
	@echo "=== Compose Services ==="
	@docker-compose -f docker-compose.yml config --services
	@echo ""
	@echo "=== Running Containers ==="
	@docker-compose -f docker-compose.yml ps
