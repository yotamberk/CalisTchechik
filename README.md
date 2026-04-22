# CalisTchechik

A calisthenics training app for trainers and trainees. Trainers plan weekly programs; trainees log their sessions and track progress.

## Tech Stack

- **Frontend**: Vite + React + TypeScript + TailwindCSS (PWA)
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: PostgreSQL (local Docker / Neon for production)
- **Auth**: Google OAuth (invitation-only access)
- **Deploy**: Vercel (frontend + serverless API) + Neon (Postgres)

## Getting Started (Local)

### 1. Prerequisites

- Node.js 20+
- Docker (for local Postgres) OR connection string to an existing Postgres instance

### 2. Start the database

```bash
docker compose up -d
```

This starts Postgres at `localhost:5433` with database `calistchechik`. (Port 5433 is used to avoid conflicts with any existing local Postgres instance.)

### 3. Install dependencies

```bash
npm install
```

### 4. Set up environment variables

```bash
# API
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your Google Client ID and JWT secret

# Web
cp apps/web/.env.example apps/web/.env.local
# Edit apps/web/.env.local with your Google Client ID
```

### 5. Create a Google OAuth Client

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable the **Google Identity** API
4. Create OAuth 2.0 credentials (Web application type)
5. Add authorized origins:
   - `http://localhost:5173` (dev)
   - Your Vercel domain (prod)
6. Copy the Client ID into both `.env` files

### 6. Run database migrations and seed

```bash
npm run db:migrate
npm run db:seed
```

This creates all tables and seeds `yotamberk@gmail.com` as the admin user.

### 7. Start development

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:4000

## User Roles

| Role    | Capabilities                                                                     |
|---------|---------------------------------------------------------------------------------|
| ADMIN   | Add/remove trainers, view pending access requests, act as any user              |
| TRAINER | Add trainees, create exercise pool, build plans (weeks/sessions/sections/rows)  |
| TRAINEE | View weekly plan, log sessions (RPE + notes), track progress                    |

> Multi-role: Admin has all roles. Trainers also have the TRAINEE role.  
> Role switching: Use the role switcher in the sidebar.

## Deploying to Vercel + Neon

### 1. Create a Neon database

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string (pooled)

### 2. Deploy to Vercel

1. Push this repo to GitHub at `https://github.com/yotamberk/CalisTchechik`
2. Import the project in [Vercel](https://vercel.com)
3. Set environment variables in Vercel dashboard:

```
DATABASE_URL=postgresql://...  # Neon connection string
GOOGLE_CLIENT_ID=...           # Google OAuth client ID
JWT_SECRET=...                 # Long random string (openssl rand -hex 32)
FRONTEND_URL=https://your-app.vercel.app
NODE_ENV=production
VITE_GOOGLE_CLIENT_ID=...      # Same as GOOGLE_CLIENT_ID
VITE_API_URL=/api
```

4. Add your Vercel domain to Google OAuth authorized origins
5. Deploy! Vercel auto-runs `npm run build`

### 3. Run migrations on Neon

After first deploy, run:
```bash
DATABASE_URL="your-neon-url" npm run db:migrate
DATABASE_URL="your-neon-url" npm run db:seed
```

## Project Structure

```
CalisTchechik/
  apps/
    web/          # React PWA (Vite)
    api/          # Express API
  packages/
    shared/       # Shared TypeScript types + Zod schemas
  prisma/
    schema.prisma # Database schema
    seed.ts       # Seeds admin user
  api/
    index.ts      # Vercel serverless entry
  docker-compose.yml
  vercel.json
```

## Feature Overview

### Trainer
- **Exercise Pool**: Create exercises with video links; add difficulty-ordered variants
- **Plan Builder**: Create plans per trainee → weeks → sessions (A/B/C) → sections → rows
- **Row fields**: Exercise, Variant, Sets, Volume (reps/MAX/height cm), Rest, Break, Group (supersets)
- **Feedback**: Add comments per week or per exercise row
- **Copy**: Clone a week or session to another week
- **Dashboard**: See all trainees' plan status and upcoming weeks to fill

### Trainee
- **Weekly Plan**: See current week's sessions, pick which to do today
- **Session Logging**: Set date, log RPE (1-10) and notes per exercise
- **Progress**: See current status (latest variant + volume) per exercise; progress graph over time

### Admin
- Add trainers by email
- View and dismiss unauthorized access attempts
