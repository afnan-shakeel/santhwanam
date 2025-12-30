# Response Handler Refactoring Task

## Objective
Update the global `responseHandler` middleware to use `responseSchema` instead of `dto` and remove validation logic, keeping only parsing/shaping functionality.

## Changes Required

### 1. Update Response Handler (`src/shared/middleware/responseHandler.ts`)

**Current behavior:**
- Accepts `{ dto, data, status }` from controllers
- Validates response data using Zod schemas
- Returns errors if validation fails

**New behavior:**
- Accept `{ responseSchema, data, status }` from controllers
- Only parse and shape data according to Zod schemas (no validation) and no any complications. straight behaviour,
- Trust that data is already valid from service layer

**Implementation:**
```typescript
// Change property name from 'dto' to 'responseSchema'
const isZodResponse = err && typeof err === 'object' && 'responseSchema' in err

// Extract responseSchema instead of dto
const maybeSchema = (err as any).responseSchema

// Remove validation logic - use .parse() directly instead of Mapper.safeMap()
// Just parse/shape the data, let errors bubble up naturally
const shaped = maybeSchema.parse(data)
return res.status(status).json(shaped)
```

### 2. Update All Controllers

Search and replace in all controller files:

**Files to update:**
- `src/modules/iam/api/controller.ts`
- `src/modules/auth/api/controller.ts`
- `src/modules/agents/api/controller.ts`
- `src/modules/members/api/controller.ts`
- `src/modules/organization-bodies/api/controller.ts`
- `src/modules/approval-workflow/api/controller.ts`
- `src/modules/gl/api/controller.ts`
- `src/modules/membership/api/controller.ts`

**Change pattern:**
```typescript
// OLD:
return next({ dto: SomeDto, data: result, status: 200 });

// NEW:
return next({ responseSchema: SomeDto, data: result, status: 200 });
```

**Search pattern:** `dto:`
**Replace with:** `responseSchema:`

### 3. Rationale

- **Clearer naming**: `responseSchema` is more explicit about its purpose
- **Simpler logic**: Response handler becomes a pure data shaper, not a validator
- **Performance**: Skip validation on responses (data from services is already validated)
- **Separation of concerns**: Validation happens at service/domain layer, not response layer

## Implementation Steps

1. Update `responseHandler.ts` middleware
2. Search all controller files for `dto:` pattern
3. Replace all occurrences with `responseSchema:`
4. Test a few endpoints to ensure responses work correctly
5. Run TypeScript compilation to catch any missed changes

## Expected Outcome

- All controllers use `responseSchema` property
- Response handler only shapes data without validation
- No functional changes to API responses
- Cleaner, more performant response handling
- ask me at the end if any modules/apis present without using response handlers. we will need to change them too.
