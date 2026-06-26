.PHONY: dev dev-api dev-web dev-mobile dev-android dev-ios test-api test-web migrate lint docker-up docker-down

# ── Local dev ────────────────────────────────────────────────────────────────
dev: docker-up
	@echo "▸ Starting API and web in parallel..."
	@make -j2 dev-api dev-web

dev-api:
	@cd apps/api && go run ./cmd/server

dev-web:
	@pnpm --filter web dev

dev-mobile:
	@pnpm --filter mobile start

dev-android:
	@pnpm --filter mobile android

dev-ios:
	@pnpm --filter mobile ios

# ── Docker ───────────────────────────────────────────────────────────────────
docker-up:
	@echo "▸ Starting postgres, redis, adminer..."
	docker compose up -d

docker-down:
	docker compose down

# ── Test ─────────────────────────────────────────────────────────────────────
test-api:
	@cd apps/api && go test ./... -v -race

test-web:
	@pnpm --filter web test

# ── DB ───────────────────────────────────────────────────────────────────────
migrate:
	@echo "▸ Running migrations via Go runner..."
	@cd apps/api && go run ./cmd/server --migrate-only

# ── Lint ─────────────────────────────────────────────────────────────────────
lint:
	@cd apps/api && go vet ./...
	@pnpm --filter web lint

# ── Build ────────────────────────────────────────────────────────────────────
build-api:
	@cd apps/api && CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server ./cmd/server
	@echo "▸ Built apps/api/server"
