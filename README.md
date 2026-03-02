# 🇪🇹 Gaaffilee Qorumsa Barnootaa — Backend API

Ethiopian Grade 9–12 National Exam Practice Platform · NestJS 10 · Hexagonal Modular Monolith

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- pnpm (`npm i -g pnpm`)
- PostgreSQL 15 (or Supabase project)
- Redis (or Upstash)

### 1. Install dependencies
```bash
pnpm install
```

### 2. Set up environment
```bash
cp .env.example .env
# Edit .env with your DB, Redis, Gemini, SMTP credentials
```

### 3. Run database migrations
```bash
pnpm prisma:migrate:dev --name initial_schema
```

### 4. Seed the database
```bash
# First generate a bcrypt hash for admin password:
node -e "const bcrypt=require('bcrypt'); bcrypt.hash('YourAdminPass123!',12).then(h=>console.log(h))"
# Set SEED_ADMIN_HASH=<hash> in your .env, then:
pnpm prisma:seed
```

### 5. Start the development server
```bash
pnpm start:dev
```

### 6. Open Swagger UI
```
http://localhost:4000/docs
```

---

## 📁 Project Structure

```
src/
├── main.ts                         # Bootstrap + Swagger setup
├── app.module.ts                   # Root module
├── config/                         # Env validation + constants
├── common/                         # Guards, interceptors, filters, decorators
├── prisma/                         # PrismaService (global)
├── redis/                          # RedisService (global)
└── modules/
    ├── auth/                       # Standard NestJS — JWT, OTP
    ├── navigation/                 # Standard NestJS — streams/subjects/chapters
    ├── questions/    [Hexagonal]   # Filter + Fisher-Yates shuffle, no correct_answer
    ├── sessions/     [Hexagonal]   # State machine, timer enforcement, scoring
    ├── ai/           [Hexagonal]   # AiProviderPort → GeminiAdapter
    ├── dashboard/                  # Standard NestJS — aggregated analytics
    └── admin/                      # Standard NestJS — CRUD, CSV upload
```

## 🔑 Key Architecture Decisions

| Decision | Rationale |
|---|---|
| **Hexagonal on 3 modules only** | sessions/ai/questions have domain logic worth isolating; CRUD modules don't |
| **Redis fail-secure on JWT denylist** | Revoked tokens must never be accepted; 503 during Redis outage is safer than accepting bad tokens |
| **Redis fail-open on navigation cache** | Navigation data isn't sensitive; DB fallback returns correct data |
| **correct_answer excluded structurally** | `QuestionDeliveryDto` type has no such field — TypeScript enforces this, not runtime checks |
| **Answer upsert idempotency** | `UNIQUE(session_id, question_id)` means network retries never create duplicate answers |
| **Server-side timer** | `SessionTimerGuardService` validates exam_simulation answers server-side, preventing client bypass |

## 🧪 Running Tests

```bash
# Unit tests (pure core services — no mocks needed)
pnpm test

# With coverage
pnpm test:coverage

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## 🌐 API Endpoints Summary

| Module | Endpoints |
|---|---|
| **Auth** | POST /register /login /logout /refresh /forgot-password /verify-otp /reset-password · GET+PATCH /me |
| **Navigation** | GET /streams /subjects /chapters /years /questions/count |
| **Questions** | GET /questions (Public) |
| **Sessions** | POST /sessions · GET /sessions · POST /:id/answer · POST /:id/skip · PATCH /:id/complete · GET /:id/review |
| **AI** | POST /ai/hint /ai/explain /ai/chat /ai/weakness-report /ai/generate-questions · GET /ai/weakness-report |
| **Dashboard** | GET /dashboard/me /me/history /me/weaknesses /me/trends /me/subjects |
| **Admin** | Full CRUD /admin/questions /admin/chapters /admin/users /admin/analytics/* |

## 🔐 Security Model

- **JWT** HS256, 7-day expiry, `jti` claim for Redis denylist
- **Bcrypt** cost factor 12, max 72 chars (prevents DoS)
- **OTP** SHA-256 hashed, 10-min expiry, 3-attempt limit
- **Account lock** 5 failures → 15-min Redis lock
- **RBAC** `student | teacher | admin` via `@Roles()` + `RolesGuard`
- **Input validation** Global `ValidationPipe` (whitelist + forbidNonWhitelisted)

## 🚢 Production Deployment 

```bash
# Set all env vars in Railway dashboard, then:
pnpm prisma:migrate:deploy   # uses DIRECT_URL
pnpm build
pnpm start:prod
```

⚠️  **Never** wire `DIRECT_URL` into `PrismaService` at runtime — it bypasses PgBouncer pooling.

## 📦 Switching AI Provider

To replace Gemini with another LLM, implement `AiProviderPort` in a new adapter:
```typescript
// src/modules/ai/infrastructure/openai.adapter.ts
export class OpenAiAdapter extends AiProviderPort { ... }

// src/modules/ai/ai.module.ts — one line change:
{ provide: AiProviderPort, useClass: OpenAiAdapter }
```
