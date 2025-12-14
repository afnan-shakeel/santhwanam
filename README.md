# Santhwanam Server (Express + TypeScript)

Minimal Express.js + TypeScript starter for the Santhwanam backend.


Quick start

1. Install dependencies

```powershell
npm install
```

2. Run in development mode

```powershell
npm run dev
```

3. Build and run

```powershell
npm run build
npm start
```

Notes

- Environment variables can be placed in a `.env` file (port, NODE_ENV, etc.).
- This project uses `ts-node-dev` for fast development reloads.

Next steps

- Add feature modules under `src/modules/<feature>/` following the architecture.
- Add ESLint/Prettier configs and run `npm run lint`.
 
Import aliases

- TypeScript path aliases are configured so you can import from `src` using `@/...`.
- Example: `import app from '@/app'` or `import { PORT } from '@config/env'`.

Dev usage

- The dev server preloads `tsconfig-paths` so aliases work during `npm run dev`.

Database (Prisma + Postgres)

- This project uses Prisma as the ORM. The datasource expects a `DATABASE_URL` environment variable (Postgres).
- Example `.env` entry: `DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=public"` (see `.env.example`).

Install and initialize Prisma locally:

```powershell
npm install @prisma/client
npm install -D prisma

# generate the client after creating/updating `prisma/schema.prisma`
npx prisma generate

# push schema to the database (non-migration approach)
npx prisma db push

# or create a migration (recommended for production workflows)
npx prisma migrate dev --name init
```

Server usage reminder

- Set `DATABASE_URL` in your `.env` (or env provider) to your hosted Postgres connection string, then run `npm run dev`.
