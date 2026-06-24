# Reelstack

> Your film taste, publicly yours.

A social film/TV watchlist platform — think Spotify for your movie taste. Search any title, see which streaming services have it, save it to a list, share your list publicly.

## Stack

| Layer | Tech |
|-------|------|
| Backend API | Go + Fiber |
| Database | PostgreSQL (Neon in prod) |
| Cache | Redis (Upstash in prod) |
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Deploy | Railway (API) + Vercel (Web) |

## Quick start

```bash
# 1. Copy env files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 2. Start infrastructure
make docker-up

# 3. Install frontend deps
pnpm install

# 4. Run everything
make dev
```

API runs at http://localhost:8080  
Web runs at http://localhost:3000  
Adminer (DB UI) at http://localhost:8080 → wait, adminer is on port 8081 — check docker-compose.yml  

## Project structure

```
reelstack/
├── apps/
│   ├── api/          # Go backend
│   └── web/          # Next.js frontend
├── docs/decisions/   # Architecture decision records
├── docker-compose.yml
└── Makefile
```

## Scripts

| Command | Does |
|---------|------|
| `make dev` | Starts docker + api + web |
| `make test-api` | Go tests with race detector |
| `make migrate` | Runs DB migrations |
| `make lint` | go vet + eslint |
| `make build-api` | Produces linux/amd64 binary |
