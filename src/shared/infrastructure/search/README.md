Search Service (src/shared/infrastructure/search)

This document explains the Search Service used by the server application. It describes why the service exists, how it fits into the architecture, how the request/response objects are shaped, and how to extend or tune the search behavior for new models.

## Purpose

- Provide a single, consistent API for advanced searching across application data (members, contributions, cycles, claims, etc.).
- Abstract underlying search implementation (could be a full-text search engine, a database-backed search, or a hosted search product) so application code uses a single interface.
- Support complex filters, sorting, pagination, relation eager-loading and field-level search across multiple models.

Why use a Search Service?
- Performance: search engines are optimized for text search and complex queries that are expensive in a relational DB.
- Flexibility: use multi-field relevance, fuzzy matching, and configurable analyzers.
- Decoupling: the app code calls `searchService.execute(...)` and doesn't need to know provider details.

## High-level architecture

- `searchService` (public API exported under `src/shared/infrastructure/search`) accepts a structured search request and returns a paginated, consistent response.
- Internally the service delegates to a provider/adapter implementation. Example adapters might include:
  - ElasticSearch adapter
  - MeiliSearch adapter
  - DB-backed adapter (using Prisma/SQL for simple queries)
- Each adapter is responsible for mapping the request into provider-specific queries and mapping results back into the common response format.

Diagram (logical):

App Code -> `searchService.execute(request)` -> Adapter (Elastic/Meili/DB) -> Provider -> results -> mapped -> response

## Request format (typical)

The Search Service accepts a JSON object with the following (commonly used) fields. Fields may vary depending on how `searchService` was implemented in your repo, but this follows the patterns used in the codebase.

- `model` (string) — Required. The target model to search, e.g. `Member`, `ContributionCycle`, `MemberContribution`.
- `searchTerm` (string) — Optional. A free-text term searched across `searchFields`.
- `searchFields` (array[string]) — Optional. Fields to limit the free-text search to (e.g., `['firstName','lastName','memberCode']`). If omitted, a default per-model set is used.
- `filters` (array of filter objects) — Optional. Each filter object usually has { field, operator, value } where operator can be `equals`, `contains`, `gte`, `lte`, `in`, etc.
- `relations` (array[string]) — Optional. Relations (e.g., `['cycle','member','agent']`) to include in the results.
- `sort` (object or array) — Optional. Fields and direction to sort by.
- `page` (integer) — Optional. Page number (default 1).
- `limit` (integer) — Optional. Page size (default 20).

Example request (contributions search):

```
{
  "model": "MemberContribution",
  "searchTerm": "John",
  "searchFields": ["memberName", "memberCode"],
  "filters": [ { "field": "contributionStatus", "operator": "equals", "value": "Pending" } ],
  "relations": ["cycle", "agent", "member"],
  "page": 1,
  "limit": 20
}
```

## Response format (typical)

The search service returns a consistent response object, for example:

```
{
  "contributions": [ /* array of objects */ ],
  "total": 123
}
```

When `searchService.execute` is used across endpoints the result shape varies slightly by model (e.g., `cycles`, `contributions`, `members`) — but every adapter returns the same structural contract: results array + total count + optional metadata.

Example (generic):

```
{
  "results": [ { /* document */ }, ... ],
  "total": 345,
  "page": 1,
  "limit": 20
}
```

## How it's used in the codebase

- Controllers call `searchService.execute({...})` with the appropriate `model` and options.
- The controllers then validate or map the returned documents to the API DTOs before sending to clients.

Example usage (pseudo-code):

```
const result = await searchService.execute({
  model: 'MemberContribution',
  searchTerm: 'MEM-2025',
  filters: [{ field: 'cycleId', operator: 'equals', value: cycleId }],
  relations: ['member','cycle','agent'],
  page: 1,
  limit: 20
});

// controller maps result -> DTO -> response
```

## Adding a new model to search

1. Identify the model and fields to index (e.g., `memberCode`, `firstName`, `lastName`, `agentCode`).
2. Configure the adapter index mapping (provider-specific). For Elasticsearch/Meili, add appropriate analyzers and field types.
3. Ensure application logic indexes model changes (create/update/delete) into the search index. Typically you add event handlers to publish index updates.
4. Add a default `searchFields` set so the service knows which fields to search when `searchTerm` is provided.
5. Add tests that assert search requests return expected results.

## Practical tips & conventions

- Prefer searchable `searchFields` that are small and meaningful (name, code, email). Avoid indexing very large text fields unless needed.
- Use `filters` for exact and numeric comparisons; use `searchTerm` for free-text.
- For `searchTerm` lookups that must search across name fields, combine `firstName`, `lastName`, and `memberCode` into the `searchFields`.
- Keep pagination consistent: controllers expect `{ page, limit }` and default to `1` and `20` if omitted.

## Performance and scaling

- For large datasets use a dedicated search engine (Elasticsearch, MeiliSearch, Typesense). DB-backed search is fine for small datasets but will not scale for heavy text-search workloads.
- Tune index refresh intervals, replicas, and analyzers depending on read/write patterns.
- When reindexing, run in a background job and avoid blocking API routes.

## Security and multi-tenancy

- Ensure searches are scoped to the current forum/tenant when applicable by adding a tenant filter (e.g., `forumId`) automatically in controllers or adapters.
- Sanitize filter inputs to avoid injection in provider-specific queries.

## Testing and debugging

- Add unit tests for adapter mapping logic. For provider integration tests, spin up a test instance (e.g., Docker image for Elastic/Meili) and validate index+search flows.
- Log provider queries for debugging but avoid logging sensitive data.

## Maintenance and operations

- Provide scripts or admin endpoints to reindex a model when schema changes.
- Monitor index size and query latencies.

## Example: contribution cycle quick view (how to assemble data)

- To build the "Contribution Cycles Quick View" (admin):
  1. Use `searchService.execute` with `model: 'ContributionCycle'` and `filters: [{ field: 'cycleStatus', operator: 'equals', value: 'Active' }]`.
  2. Collect returned cycles list and compute aggregate stats on the server or client: `activeCyclesCount`, `totalCollecting` (sum of `totalCollectedAmount`), and `avgCompletionPercentage` (avg of `membersCollected / totalMembers * 100`).

## Where to look in the repo

- Implementation entry: `src/shared/infrastructure/search`.
- Check adapters (if present) for provider-specific code: e.g., `src/shared/infrastructure/search/adapters/*`.
- Controllers that use search: `src/modules/*/api/controller.ts` (look for `searchService.execute`).

## Follow-ups you might want

- Add a short README script for reindexing and mapping configuration for the chosen provider.

---

If you want, I can also:
- generate a `reindex` script (migration-style) to rebuild indices for a model;
- scaffold an example Meili/Elastic adapter implementation;
