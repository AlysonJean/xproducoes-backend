# Backend Architecture Decisions - X Produções

## 1. Safe Routing Pattern

**Status**: Implemented
**Date**: 2026-02-10
**Context**:
Express.js 4.x does not automatically catch rejected Promises in async route handlers. If an async function throws an error (or rejects) without calling `next(error)`, the request hangs indefinitely until timeout.
Previous implementation relied on developers manually adding `try/catch` blocks in every controller method. This was error-prone and led to "hanging requests" when exceptions occurred.

**Decision**:
We implemented a `createSafeRouter()` factory that wraps Express Router.
- **How it works**: It intercepts `get`, `post`, `put`, `delete`, `patch` calls and wraps the handler function.
- **Mechanism**: The wrapper executes the original handler and appends `.catch(next)` to the returned Promise.
- **Coverage**: All route files in `src/routes/*.ts` have been migrated to use `createSafeRouter()`.

**Benefits**:
- **Reliability**: No more hanging requests due to unhandled async errors.
- **Maintenance**: Controllers can throw errors directly without boilerplate `try/catch`.
- **Security**: Centralized error handling ensures unified response format and prevents leaking sensitive stack traces (if configured in production).

## 2. Protected Routes Auditing

**Status**: In Progress
**Context**:
Routes were audited to ensure consistent use of `authenticate` middleware.

**Next Steps**:
- Verify Rate Limiting configuration for sensitive endpoints (auth, payment).
- Implement Zod schema validation middleware for all POST/PUT bodies.

## 3. Pagination Convention

**Status**: Implemented (retrofitted 2026-07-13)
**Context**:
A real bug was found while auditing this convention: `bookingController.findAll()` already computed `skip`/`take` from `page`/`limit` query params and injected them into the filters object passed to `bookingCrudService.getAllBookings(filters)` — but `getAllBookings` never read them back (the Zod-inferred `BookingFilters` type didn't even define `skip`/`take`). TypeScript's excess-property check only applies to object *literals*, not to a variable being passed through, so this went undetected by `tsc`. The real-world effect: every "page" of `GET /admin/reservas` (and any other consumer of that endpoint) returned the exact same full result set, even though the response `meta` honestly advertised `page`/`limit`/`totalPages`/`hasMore` as if it worked. A second, related instance was found in `adminController.getAllBookings`: it fetched the *entire* matching table and paginated with `.slice()` in memory — functionally correct, but wasteful (full table scan on every page), with a code comment already flagging it as a known compromise ("idealmente seria no service").

Meanwhile, `equipmentRepository.ts` (and other repositories under `src/repositories/`) already implement the correct pattern via a shared `PaginationOptions { page, limit }` interface. This section documents that already-correct pattern as the standard, now that `bookingCrudService` matches it too.

**Decision** — the standard pagination shape for any list endpoint:

1. **Route/controller** parses `page`/`limit` from `req.query`, with sane defaults and a hard ceiling (e.g. `const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)`), and computes `const skip = (page - 1) * limit`.
2. **Service/repository** accepts `skip`/`take` as optional fields on its filters/options object and passes them **directly through to the Prisma `findMany` call** — never slices the result array in application code. Omitting `skip`/`take` (`undefined`) must mean "no pagination" (Prisma ignores `undefined` limits), so existing callers that don't paginate keep working unchanged.
3. **Response shape**: `{ success: true, data: <array>, meta: { total, page, limit, totalPages } }`, where `total` comes from a parallel `count()` call (same `where` filters, without `skip`/`take`) run via `Promise.all` alongside the paginated `findMany`.

Reference implementations: `src/repositories/equipmentRepository.ts` (`PaginationOptions`), `src/services/userService.ts` (`getAllUsers`), `src/services/booking/bookingCrudService.ts` (`getAllBookings`, retrofitted).

**When *not* to add full pagination**: for admin-only, low-volume, non-paginated-in-the-UI lists (e.g. `contactService.getAllSubmissions()`, `portfolioService.findAll()`), a bare `take: N` safety cap (no `skip`, no page param, no `meta`) is a proportionate alternative — full pagination would require reworking the frontend page's client-side search/filter UI for no real benefit at current data volumes. Document the reasoning inline (see those two files) rather than defaulting to full pagination everywhere out of consistency for its own sake.

## 4. Repository vs. Service Layering

**Status**: Documented as observed, not retroactively enforced
**Context**:
The codebase has two coexisting patterns for data access, neither fully consistent, both intentional in their own contexts:

- **Repository layer** (`src/repositories/*.ts`): a thin, entity-scoped wrapper directly over Prisma (`equipmentRepository`, `kitRepository`, `userRepository`, `bookingRepository`, `categoryRepository`, `collaboratorRepository`, `collaboratorFunctionRepository`, `cartRepository`, `serviceRepository`). Used when an entity's query surface is large/reused enough to benefit from a dedicated, testable module separate from business-logic orchestration.
- **Service-does-its-own-Prisma-calls** (`src/services/*.ts`, e.g. `contactService`, `portfolioService`, `reviewService`, and the `src/services/booking/*.ts` split): the service function/class calls `prisma` directly. Used when the entity's data-access surface is small enough that a separate Repository file would be pure ceremony.

**Decision**: don't force one pattern onto the other retroactively — a mechanical "everything must have a Repository" migration would touch a large surface for no functional benefit and real regression risk, the same reasoning that kept `bookingService.ts`'s decomposition scoped to *services* (not a further Repository split) in this cycle. Going forward: reach for a dedicated Repository file when a new entity's query surface is genuinely reused across multiple services/controllers or grows past a handful of methods; keep it inline in the service when it's a handful of straightforward Prisma calls used from one place. When in doubt, match the nearest existing sibling (e.g. new booking-adjacent code should look at `src/services/booking/`, new catalog-adjacent code should look at `src/repositories/equipmentRepository.ts`).
