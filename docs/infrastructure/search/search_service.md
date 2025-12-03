# Search Service

This document describes a reusable Search Service intended to list database model records with pagination, search, filtering, sorting, and eager fetching of relations. It includes the request/response schema, filter/operator definitions, builder functions, implementation notes for ORMs (Prisma examples), example usage, and testing / performance guidance.

**Goals:**
- **Flexible:** support multiple models via a single service.
- **Composable:** separate builder functions for filters, search, sort, eager load, and pagination.
- **Safe:** validate inputs and avoid injection risks.
- **Efficient:** support pagination and eager-loading while protecting against heavy queries.

**Result shape:**
- `items`: list of model records (with included relations as requested).
- `total`: total matching records count (without pagination applied).
- `page`: current page number.
- `pageSize`: number of items per page.
- `totalPages`: computed total pages.

## SearchRequest (concept)

Description: A class or plain object representing a search request with parameters for pagination, filtering, sorting, search term, and eager loading.

Properties:
- `model`: identifier for the database model to query (e.g., `User`).
- `filters`: array of filter objects or a filter tree; see `Filter` below.
- `searchTerm`: string used for multi-field text search.
- `searchFields`: optional array of fields to run `searchTerm` against; falls back to model config.
- `sortBy`: field or array of fields to sort by (e.g., `createdAt`).
- `sortOrder`: `'asc' | 'desc'` (or per-field order when array provided).
- `page`: page number (default `1`).
- `pageSize`: records per page (default `10`).
- `eagerLoad`: array of relation names to include (e.g., `['profile','roles']`).

Example (TypeScript-ish):

```ts
const searchRequest = {
    model: 'User',
    filters: [
        { field: 'status', value: 'active', operator: 'equals' },
        { field: 'age', value: 18, operator: 'gte' }
    ],
    searchTerm: 'john',
    searchFields: ['firstName','lastName','email'],
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 2,
    pageSize: 20,
    eagerLoad: ['profile','roles']
}
```

## Filter shape and operators

Minimal Filter type:
- `field`: string — field on model or nested relation path (e.g., `profile.city`).
- `value`: string | number | boolean | Array | { from: Date, to: Date } for ranges.
- `operator`: string — one of the supported operators.
- `negate` (optional): boolean — invert the operator (NOT).

Common operators (translate to ORM-specific clauses):
- `equals` — equality.
- `notEquals` — inequality.
- `contains` — substring (text) / array contains.
- `in` — value is in list.
- `notIn` — not in list.
- `gte` / `lte` / `gt` / `lt` — comparisons (numbers/dates).
- `between` — range with `{ from, to }`.
- `isNull` / `isNotNull` — null checks.

Filter combinators:
- Allow grouping with `and` / `or` combinator nodes for complex expressions. For simple use, an array is treated as `AND`.

## Builders (recommended)

The design encourages single-responsibility builder functions that convert SearchRequest pieces into ORM-specific query fragments.

1) `buildFilters(filters, modelConfig) => ormWhere`:
- Convert Filter[] or tree to the ORM `where` clause.
- Validate fields against `modelConfig.allowedFilterFields`.

2) `buildSearch(searchTerm, searchFields, modelConfig) => ormWhereFragment`:
- Produce a fragment that ORs `contains` conditions across allowed `searchFields`.

3) `buildSort(sortBy, sortOrder, modelConfig) => ormOrderBy`:
- Map field names to allowed sortable fields and return ORM `orderBy` array/object.

4) `buildEagerLoad(eagerLoad, modelConfig) => ormInclude`:
- Validate requested relations against `modelConfig.allowedEagerLoads`.
- Return ORM `include` object (possibly nested) or an array depending on ORM.

5) `buildPagination(page, pageSize) => { skip, take }`:
- Convert page-based pagination into `skip` and `take`.

These builders are pure and testable functions.

## Model configuration

For each model, keep a small config object to whitelist fields and relations. Example:

```ts
const ModelConfig = {
    User: {
        searchable: ['firstName','lastName','email'],
        sortable: ['createdAt','updatedAt','age'],
        filters: ['status','age','roleId','createdAt'],
        relations: ['profile','roles']
    }
}
```

This prevents arbitrary field usage and helps map user-friendly keys to DB columns.

## Prisma Implementation Example (TypeScript)

This example demonstrates how builders translate into a Prisma query. Adjust to your structure and naming conventions.

Helper types:

```ts
type SearchRequest = {
    model: string;
    filters?: Filter[];
    searchTerm?: string;
    searchFields?: string[];
    sortBy?: string | string[];
    sortOrder?: 'asc' | 'desc' | Record<string, 'asc'|'desc'>;
    page?: number;
    pageSize?: number;
    eagerLoad?: string[];
}

type SearchResult<T> = {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}
```

Example builder translations (simplified):

```ts
function buildPagination(page = 1, pageSize = 10) {
    const take = Math.min(pageSize, 100); // enforce max page size
    const skip = (Math.max(page, 1) - 1) * take;
    return { skip, take };
}

function buildSearchWhere(searchTerm?: string, fields: string[] = []) {
    if (!searchTerm || !fields.length) return undefined;
    return {
        OR: fields.map(field => ({ [field]: { contains: searchTerm, mode: 'insensitive' } }))
    };
}

function buildFiltersWhere(filters = []) {
    if (!filters.length) return undefined;
    // naive AND combination example
    const clauses = filters.map(f => {
        switch (f.operator) {
            case 'equals': return { [f.field]: f.value };
            case 'contains': return { [f.field]: { contains: f.value, mode: 'insensitive' } };
            case 'gte': return { [f.field]: { gte: f.value } };
            case 'lte': return { [f.field]: { lte: f.value } };
            case 'in': return { [f.field]: { in: f.value } };
            case 'between': return { [f.field]: { gte: f.value.from, lte: f.value.to } };
            default: throw new Error(`Unsupported operator ${f.operator}`);
        }
    });
    return Object.assign({}, ...clauses.map((c, i) => ({ [`AND_${i}`]: c }))).AND || { AND: clauses };
}

// Example usage in a SearchService.execute
async function executePrismaSearch(prisma, modelName, request, modelConfig) {
    // Validate fields / relations using modelConfig here
    const { skip, take } = buildPagination(request.page, request.pageSize);
    const searchWhere = buildSearchWhere(request.searchTerm, request.searchFields || modelConfig.searchable);
    const filtersWhere = buildFiltersWhere(request.filters || []);

    // Merge where clauses: AND(searchWhere, filtersWhere)
    const where = [filtersWhere, searchWhere].filter(Boolean);
    const mergedWhere = where.length === 1 ? where[0] : { AND: where };

    const orderBy = request.sortBy ? { [request.sortBy]: request.sortOrder || 'desc' } : undefined;
    const include = (request.eagerLoad || []).reduce((acc, rel) => { acc[rel] = true; return acc; }, {} as any);

    const [items, total] = await prisma.$transaction([
        // items
        prisma[modelName].findMany({ where: mergedWhere, orderBy, include, skip, take }),
        // total
        prisma[modelName].count({ where: mergedWhere })
    ]);

    const page = request.page || 1;
    const pageSize = request.pageSize || take;
    return {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
    };
}
```

Notes:
- Use `mode: 'insensitive'` when doing case-insensitive contains on text fields (Prisma-specific).
- Validate `modelName` and properties to avoid exposing internal tables or relations.

## API / Service contract

SearchService should expose a single entrypoint like `execute(searchRequest)` which:
- Validates and sanitizes input against `ModelConfig`.
- Runs builders to produce ORM-specific query parts.
- Executes the query, fetching `items` and `total` (in a transaction if supported).
- Returns `SearchResult` object.

Example usage:

```ts
const searchService = new SearchService({ prisma, modelConfigs: ModelConfig });
const result = await searchService.execute({ model: 'User', searchTerm: 'john', page:2, pageSize:20 });
console.log(result.items, result.total);
```

## Validation & Security

- Always validate `filters.field`, `sortBy`, and `eagerLoad` against `ModelConfig` whitelists.
- Limit `pageSize` with a max (e.g., 100) to prevent abuse.
- Use parameterized/ORM constructs — never interpolate user text into raw SQL.
- Enforce per-field permission checks separately if certain users shouldn't see fields or relations.

## Performance & Scalability

- Add DB indexes for commonly searched and sorted fields (e.g., `createdAt`, `email`, status).
- For large offsets, consider cursor-based pagination instead of offset-based (skip/take).


## Extensibility & Variants

- Support authorization hooks: allow `SearchService` to accept per-request scopes that further restrict `where`.

## Example: Filter builder mapping table

- `equals` => `{ field: value }`
- `contains` => `{ field: { contains: value } }`
- `in` => `{ field: { in: [..] } }`
- `between` => `{ field: { gte: from, lte: to } }`

## Appendix: small implementation checklist

- [ ] Create `ModelConfig` for each model and register it with the service.
- [ ] Implement `SearchService.execute` with input validation and prisma transaction for (items, count).
- [ ] Add docs in README showing example queries and limitations.
