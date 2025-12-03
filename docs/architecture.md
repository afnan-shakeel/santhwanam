# Project Architecture — Note

This file documents the recommended directory structure and responsibilities to follow in the application. Keep modules small and feature-focused, prefer vertical (feature) organization, and centralize shared infra and utilities.

## Recommended Directory Structure

```text
src/
  config/
    index.ts        # central env/config loading and validation
    app.ts          # app-level configuration (ports, feature flags)
  constants/
    index.ts        # shared constant values (e.g., default pageSize)
    searchConstants.ts
  modules/
    members/
      application/
        commands/
          create-member/
            CreateMemberCommand.ts
            CreateMemberHandler.ts
        queries/
          get-member-by-id/
            GetMemberByIdQuery.ts
            GetMemberByIdHandler.ts
        services/
          (required only if complex orchestration needed, eg: member wallter module will have WalletService here)

      domain/
        repositories/
          MemberRepository.ts   # interface
        value-objects/
          MemberEmail.ts
        domain-services/
          MemberRegistrationService.ts
        events/
          MemberCreated.ts

      api/
        controllers/
          MemberController.ts
        routes/
          member.routes.ts
        validations/
          createMemberSchema.ts

    shared/
        infrastructure/
        database/
            prisma/
            PrismaClientProvider.ts
        search/
            SearchService.ts
            builders/
            FilterBuilder.ts
            SortBuilder.ts
            PaginationBuilder.ts
            EagerLoadBuilder.ts
            SearchBuilder.ts

        utils/
        logger/
            Logger.ts
        error-handling/
            ApiError.ts
            errorMiddleware.ts
```

## Short explanations (who owns what)

- **`src/modules/<feature>`**: Feature modules (e.g., `members`). Each module contains its own `application`, `domain`, and `api` layers to implement clean architecture and separation of concerns.

- **`application/`**: Commands and Queries (use-case handlers). Keep wiring, orchestration and application-level validations here. Handlers call domain services and repositories.

- **`domain/`**: Domain models, value objects, domain services, domain events, and repository interfaces. Business rules and invariants live here.

- **`api/`**: HTTP/transport layer for the feature: controllers, route definitions, request validation schemas. Keep transport-specific code out of application/domain.

- **`shared/infrastructure/`**: Implementation of infra adapters such as database providers (`PrismaClientProvider`), external integrations, and shared service implementations (e.g., concrete repository adapters) used across modules.

- **`shared/infrastructure/search`**: Central `SearchService` and builder implementations (filter, sort, pagination, eager-load, search) used by multiple modules to keep consistent list/query functionality.

- **`utils/`**: Small, pure helpers and cross-cutting utilities such as `Logger`, error types, and middleware for express/koa.

## Conventions and guidelines

- Keep modules feature-scoped to make them independently testable and maintainable.
- Expose only interfaces from `domain` (concrete infra implementations go under `shared/infrastructure`).
- Builders under `shared/infrastructure/search/builders` should be pure functions with unit tests.
- Use dependency injection (constructor injection) for repositories and services in `application` handlers.
- Validate and sanitize inputs in `api/validations` before passing to application handlers.

---

        