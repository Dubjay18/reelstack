# Deploying `apps/api` to Vercel (Dockerfile)

This document explains the minimal settings and environment variables to deploy the `apps/api` service to Vercel using the existing `Dockerfile`.

Required Vercel project settings
- Root Directory: `apps/api`
- Framework / Application Preset: Go or Docker (if a preset is required, Docker is fine)
- Install Command: leave blank (Dockerfile performs dependency install)
- Build Command: leave blank
- Output Directory: leave blank / N/A

Files added
- `vercel.json` — pins Vercel to build the `Dockerfile` using `@vercel/docker`.

Important environment variables (set these in Vercel Dashboard → Settings → Environment Variables)
Copy the names below exactly and set values via the Vercel UI (do NOT commit secrets):
- PORT
- DATABASE_URL
- REDIS_URL
- JWT_SECRET
- TMDB_API_KEY
- WATCHMODE_API_KEY
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REDIRECT_URL (set to https://<your-vercel-domain>/api/v1/auth/google/callback)
- RABBITMQ_URL
- RESEND_API_KEY
- CRON_SECRET
- ALLOWED_ORIGINS
- APP_URL

Notes and gotchas
- The `Dockerfile` exposes port `8080` and the app reads `PORT` from env; Vercel will set a port for the container — keep `PORT` configured or allow default `8080`.
- Ensure your database and RabbitMQ are reachable from Vercel (public host, or use a cloud DB with proper network rules).
- Update Google OAuth redirect in Google Cloud Console to match your Vercel domain callback.
- Keep secrets (JWT_SECRET, RESEND_API_KEY, RABBITMQ_URL, DATABASE_URL) configured as Environment Variables in Vercel — never check them into source control.

Quick deploy steps
1. Push these changes to your repository and open a new Vercel project (or point an existing project at your repo).
2. In Project Settings set the Root Directory to `apps/api`.
3. In the Environment Variables section add the variables listed above for the `Production` environment (and `Preview` if needed).
4. Deploy — Vercel will build the Docker image (using `vercel.json` + `Dockerfile`) and run the container.

If you prefer a process-hosting platform (instead of Vercel containers), consider Render, Fly.io, or Railway — they may be easier for long-running services with DB migrations and worker processes.

Want me to:
- create a GitHub Action to build/push a Docker image to a registry, or
- prepare a `docker-compose.prod.yml` and Render/Fly instructions?
