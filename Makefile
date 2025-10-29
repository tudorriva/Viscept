# AI Diagram Builder Makefile

.PHONY: help dev build up down logs clean lint format test

help:
	@echo "AI Diagram Builder - Make Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  dev           Start local dev servers (Node.js)"
	@echo "  build         Build frontend and backend"
	@echo "  up            Start Docker containers"
	@echo "  down          Stop Docker containers"
	@echo "  logs          Show Docker logs"
	@echo "  clean         Remove build artifacts"
	@echo "  lint          Lint frontend and backend"
	@echo "  format        Format code (Prettier)"
	@echo "  test          Run backend tests"
	@echo "  install       Install dependencies"

# Development (local Node.js)
dev:
	@echo "Starting development servers..."
	@echo "Start backend: cd backend && npm run dev"
	@echo "Start frontend (new terminal): cd frontend && npm run dev"
	@echo ""
	@echo "Both should be running before opening http://localhost:3000"

# Build
build:
	@echo "Building frontend and backend..."
	cd frontend && npm run build
	cd backend && npm run build

# Docker
up:
	docker-compose up --build -d
	@echo "Containers started. Access http://localhost:3000"

down:
	docker-compose down

logs:
	docker-compose logs -f

clean:
	rm -rf frontend/dist backend/dist backend/build
	find . -name "node_modules" -type d -prune -exec rm -rf {} \;

# Code Quality
lint:
	cd frontend && npm run lint
	cd backend && npm run lint

format:
	cd frontend && npm run format
	cd backend && npm run format

# Tests
test:
	cd backend && npm test

# Installation
install:
	cd frontend && npm install
	cd backend && npm install
	@echo "Dependencies installed."
