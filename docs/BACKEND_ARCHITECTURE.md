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
