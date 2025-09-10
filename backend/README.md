# CollabSync Backend

Minimal Express + TypeScript API to start Phase 1 (Foundation & Authentication).

## Scripts
- dev: tsx watch src/server.ts
- build: tsc -p .
- start: node dist/server.js
- prisma:migrate: prisma migrate dev
- prisma:deploy: prisma migrate deploy

## Getting started
1. Copy .env.example to .env and update values.
2. Install dependencies:
   npm install
3. Generate Prisma client:
   npm run prisma:generate
4. Run DB migrations:
   npm run prisma:migrate
5. Start dev server:
   npm run dev

API runs at http://localhost:4000

## Health
GET /api/health -> { status: "ok" }

