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
- **Auth**: JWT 24h expiry (bcryptjs for password hashing)

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
    └── backup-db.sh        # PostgreSQL backup script (manual/cron)
```

## Key Features

1. **AI Job Poster**: Employers type natural language (Arabic dialect / Hebrew / mixed), Gemini parses to structured job data. Supports Negev Bedouin, Triangle, Galilee dialects.
2. **Hyperlocal Job Feed**: Jobs sorted by worker geolocation proximity
3. **One-Tap Application**: Workers apply instantly using pre-filled profile
4. **Mutual Rating System**: Both parties rate each other after a job (Trust Score)
5. **Credit System**: Employers buy credits to reveal worker phone numbers (1 credit) or boost jobs (3 credits)
6. **Bilingual**: Arabic (RTL) default with Hebrew toggle (AR/HE language switcher)
7. **Israeli ID/Business ID Validation**: Luhn-like check digit validation in frontend
8. **OTP Phone Verification**: Mock OTP returns code in response (demo mode); blocks job posting for unverified employers
9. **Admin Dashboard**: Protected by `ADMIN_PHONES` env var; stats, user management, ban hammer, job moderation, reports
10. **Report System**: Workers/employers can report jobs or users; admin resolves reports
11. **Ban System**: Admin can ban users by phone/ID; banned users blocked at login
12. **Legal Pages**: Bilingual Terms of Service and Privacy Policy following Israeli law (Privacy Protection Law 1981)

## Database Schema

- `users`: Workers and employers (roles, credit balance, trust score, phone verification, Israeli ID, business ID)
- `jobs`: Job listings (location, salary, boost status)
- `applications`: Worker applications to jobs
- `ratings`: Mutual rating records (updates trust_score on users)
- `reports`: User/job reports with pending/resolved status
- `bans`: Banned users (by phone and/or Israeli ID)

## API Routes

- `POST /api/users/register` - Register new user (employer gets 10 free credits)
- `POST /api/users/login` - Login with phone/password (checks ban list)
- `GET /api/users/me` - Get current user profile
- `POST /api/users/send-otp` - Send OTP to phone (mock demo mode)
- `POST /api/users/verify-otp` - Verify OTP code
- `GET /api/jobs` - List jobs (sorted by proximity if lat/lng provided)
- `POST /api/jobs` - Create job (employer only, requires phone verification)
- `POST /api/jobs/:id/boost` - Boost job (costs 3 credits)
- `POST /api/jobs/:id/applications` - Apply to job (worker, one-tap)
- `GET /api/jobs/:id/applications` - Get job applicants (employer)
- `POST /api/applications/:id/reveal-contact` - Reveal worker phone (costs 1 credit)
- `POST /api/ratings` - Submit a rating
- `GET /api/credits/balance` - Get credit balance
- `POST /api/credits/purchase` - Purchase credits (mock)
- `POST /api/ai/parse-job` - Parse natural language job description with Gemini AI
- `GET /api/admin/stats` - Admin dashboard stats (requires ADMIN_PHONES)
- `GET /api/admin/users` - User management (search by name/phone/city)
- `PATCH /api/admin/users/:id/verify` - Force verify a user's phone
- `POST /api/admin/users/:id/ban` - Ban a user (by phone + Israeli ID)
- `GET /api/admin/jobs` - All jobs management
- `DELETE /api/admin/jobs/:id` - Delete a job
- `GET /api/admin/reports` - All reports
- `PATCH /api/admin/reports/:id/resolve` - Resolve a report
- `GET /api/admin/bans` - All bans list
- `DELETE /api/admin/bans/:id` - Unban a user
- `POST /api/reports` - Submit a report (job or user)

## Auth Flow

- JWT stored in localStorage as `monjez_token` (24h expiry)
- Sent as `Bearer` token in `Authorization` header
- Employers get 10 free credits on registration
- Error handling: `e?.data?.message` (not `e?.response?.data?.message`)

## Admin Access

- Controlled by `ADMIN_PHONES` env var (comma-separated phone numbers)
- **IMPORTANT**: Update `ADMIN_PHONES` in Replit Secrets tab to your actual phone number
- Default placeholder: `0500000000` (must be changed!)
- Admin route: `/admin` in the frontend

## Environment Variables

- `SESSION_SECRET` — JWT signing secret (set in Replit Secrets)
- `AI_INTEGRATIONS_GEMINI_API_KEY` — Gemini API key (auto-configured)
- `AI_INTEGRATIONS_GEMINI_BASE_URL` — Gemini base URL (auto-configured)
- `DATABASE_URL` — PostgreSQL connection string (auto-configured)
- `ADMIN_PHONES` — Comma-separated admin phone numbers (set to `0500000000` placeholder)

## Frontend Pages

- `/` — Auth page (login/register)
- `/worker` — Worker job feed
- `/worker/applications` — Worker's applications list
- `/employer` — Employer dashboard (my jobs)
- `/employer/post` — Post new job (requires phone verification)
- `/employer/jobs/:id` — Job details + applicants
- `/verify-phone` — Phone OTP verification page
- `/credits` — Buy credits page
- `/profile` — User profile
- `/admin` — Admin dashboard (protected by ADMIN_PHONES)
- `/terms` — Bilingual Terms of Service (AR/HE)
- `/privacy` — Bilingual Privacy Policy (AR/HE)

## Root Commands

- `pnpm run build` — runs typecheck then builds all packages
- `pnpm run typecheck` — runs tsc --build --emitDeclarationOnly

## Key Packages

### `artifacts/api-server`

Express 5 API server. Routes in `src/routes/`: users, jobs, applications, ratings, credits, ai-parse, admin, reports.

- bcryptjs: password hashing (pure JS)
- jsonwebtoken: JWT auth (24h expiry)
- @google/genai: Gemini AI SDK

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Schema tables: users, jobs, applications, ratings, reports, bans.

### `artifacts/monjez`

React + Vite frontend with bilingual support (Arabic RTL / Hebrew). Uses Rubik font for both scripts.
Key components: `AppLayout` (sidebar + bottom nav), `ReportButton`, auth pages, admin dashboard.
