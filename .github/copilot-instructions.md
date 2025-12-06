# GitHub Copilot Instructions

This is an Express.js backend application using TypeScript.

## Architecture & Code Organization

Follow the vertical (feature-based) structure from `docs/architecture.md`:
- `src/config/` – Configuration and environment
- `src/constants/` – Shared constants
- `src/modules/<feature>/` – Feature modules with `application/`, `domain/`, and `api/` layers
- `src/shared/infrastructure/` – Prisma client, database implementations, search service
- `src/shared/utils/` – Logger, error handling, utilities

**Layers:**
- **Application**: Use-case handlers (commands/queries), orchestration, application-level validation
- **Domain**: Repository interfaces, entities, value objects, domain services, events
- **API**: Controllers, routes, request validations (schema-based with zod)
- **Shared Infrastructure**: Concrete repository implementations, database adapters, shared services

**Each feature module should be self-contained with its own application, domain, and API layers.**

## Technology Stack

- **ORM**: Prisma – all database operations through Prisma
- **Auth**: Supabase for authentication flows only
- **RBAC**: Managed within the application, not Supabase policies
- **Exception Handling**: Global exception handler middleware – let all errors bubble up to it
- **Validation**: Use zod for request schema validation in `api/validations/`
 - **Linting**: Use `ESLint` configured for `ESNext` (modern JavaScript/TypeScript features)

## Key Rules

- **Package management**: NEVER manually edit `package.json`. Use `npm install/update/uninstall` only
- **Dependency injection**: Inject repositories and services via constructors
- **Repository pattern**: Define interfaces in `domain/repositories/`, implementations in `shared/infrastructure/`
- **Error handling**: Use custom error classes in `shared/utils/error-handling/`, no scattered try/catch blocks
- **Type safety**: Well-typed TypeScript, avoid `any`
 - **Documentation files**: no need of creating doc file or md file if not sepcified to
