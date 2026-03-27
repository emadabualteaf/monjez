# Workspace

## Overview

**Monjez (منجز)** — Bilingual (Arabic/Hebrew) Smart Labor Marketplace connecting employers and workers in the Arab sector in Israel.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5 (Node.js)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite (Tailwind CSS, Rubik font for Arabic/Hebrew)
- **AI**: Gemini 2.5 Flash via Replit AI Integrations
- **Auth**: JWT (bcryptjs for password hashing)

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── monjez/             # React frontend app (previewPath: /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
└── scripts/
```

## Key Features

1. **AI Job Poster**: Employers type natural language, Gemini parses to structured job data
2. **Hyperlocal Job Feed**: Jobs sorted by worker geolocation proximity
3. **One-Tap Application**: Workers apply instantly using pre-filled profile
4. **Mutual Rating System**: Both parties rate each other after a job (Trust Score)
5. **Credit System**: Employers buy credits to reveal worker phone numbers (1 credit) or boost jobs (3 credits)
6. **Bilingual**: Arabic (RTL) default with Hebrew toggle

## Database Schema

- `users`: Workers and employers (roles, credit balance, trust score)
- `jobs`: Job listings (location, salary, boost status)
- `applications`: Worker applications to jobs
- `ratings`: Mutual rating records (updates trust_score on users)

## API Routes

- `POST /api/users/register` - Register new user (employer gets 10 free credits)
- `POST /api/users/login` - Login with phone/password
- `GET /api/users/me` - Get current user profile
- `GET /api/jobs` - List jobs (sorted by proximity if lat/lng provided)
- `POST /api/jobs` - Create job (employer only)
- `POST /api/jobs/:id/boost` - Boost job (costs 3 credits)
- `POST /api/jobs/:id/applications` - Apply to job (worker, one-tap)
- `GET /api/jobs/:id/applications` - Get job applicants (employer)
- `POST /api/applications/:id/reveal-contact` - Reveal worker phone (costs 1 credit)
- `POST /api/ratings` - Submit a rating
- `GET /api/credits/balance` - Get credit balance
- `POST /api/credits/purchase` - Purchase credits (mock)
- `POST /api/ai/parse-job` - Parse natural language job description with AI

## Auth Flow

- JWT stored in localStorage as `monjez_token`
- Sent as `Bearer` token in `Authorization` header
- Employers get 10 free credits on registration

## Root Commands

- `pnpm run build` — runs typecheck then builds all packages
- `pnpm run typecheck` — runs tsc --build --emitDeclarationOnly

## Key Packages

### `artifacts/api-server`

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- bcryptjs: password hashing
- jsonwebtoken: JWT auth
- @google/genai: Gemini AI SDK

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Schema tables: users, jobs, applications, ratings.

### `artifacts/monjez`

React + Vite frontend with bilingual support (Arabic RTL / Hebrew). Uses Rubik font for both scripts.
