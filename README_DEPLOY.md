# Deploy guide (backend)

This document explains how to deploy the backend to a container provider (Fly.io recommended), use Supabase for Postgres, and Vercel for the frontend.

## Prerequisites
- GitHub repo with this code
- Fly account and `flyctl` (for Fly)
- Supabase project (Postgres) or Neon
- Vercel account for frontend

## Steps

1. Create Supabase project
   - Create project and copy `DATABASE_URL` (Postgres)

2. Create Fly app
   - `flyctl launch` (follow prompts) or create app on dashboard
   - Add secrets in Fly dashboard or via CLI:
     - `flyctl secrets set DATABASE_URL=... JWT_SECRET=... CLOUDINARY_URL=...`

3. Configure GitHub Secrets
   - repository -> Settings -> Secrets -> Actions
   - Add `FLY_API_TOKEN` (if deploying to Fly)

4. Migrations
   - Locally run `npx prisma migrate dev --name init` for development
   - In CI: `npx prisma migrate deploy` is run automatically by workflow

5. Frontend
   - Connect frontend repo to Vercel, set `VITE_*` envs

6. Healthcheck
   - Make sure `/health` returns 200 for liveness

## Notes
- Never commit `.env`
- Use backups in Supabase
- Use Sentry for errors

