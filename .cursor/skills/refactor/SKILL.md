---
name: refactor
description: >-
  Systematic codebase refactoring: deduplicate code, extract shared modules,
  fix types, add tests for core functionality, fix performance and bugs, add
  JSDoc for key design decisions, and enforce DRY/singleton/good module
  principles. Use when the user asks to refactor, clean up, or improve code
  quality across a project.
---

# Refactor

Systematic refactoring workflow. Run each phase in order, completing one before
starting the next. Use the todo list to track progress across phases.

## Phase 1: Audit

Scan the full codebase and build a concrete list of issues. Categorise each as:

| Tag | Meaning |
|-----|---------|
| `DUP` | Duplicated / redundant code that violates DRY |
| `SHARED` | Logic used in 2+ files that belongs in a shared module |
| `TYPE` | Missing, incorrect, or `any`-typed values |
| `TEST` | Core path with no test coverage |
| `PERF` | Avoidable re-render, redundant async work, missing memo, large bundle |
| `BUG` | Incorrect behaviour or crash-path |
| `DOC` | Key design decision lacking a JSDoc explaining *why* |
| `SHALLOW` | Implementation that only handles the happy path — missing error handling, edge cases, cleanup, or validation |
| `MODULE` | File mixing concerns, barrel exporting unused symbols, or circular deps |

Output a numbered checklist of every issue found with its tag.

## Phase 2: Shared Extraction

1. Identify code that appears in 2+ places (helpers, constants, hooks, types).
2. Move it to the appropriate shared location:
   - `utils/` — pure functions, formatters, validators
   - `hooks/` — shared React hooks
   - `types/` — shared TypeScript interfaces / types
   - `constants/` — app-wide constants
   - `services/` — side-effectful logic (storage, API, media)
3. Update all import sites to point to the shared module.
4. Remove the duplicated inline versions.
5. Re-export from barrel files if the project already uses them.

## Phase 3: Type Hardening

1. Eliminate every `any` type that you introduced or that is in project code.
   - For third-party callback signatures where the type is truly unknown,
     use the library's exported type or `unknown` with a type guard.
2. Add explicit return types to exported functions.
3. Make sure every interface/type that crosses a module boundary has a JSDoc
   on the interface itself explaining its purpose.

## Phase 4: Bug & Performance Fixes

Fix issues tagged `BUG` and `PERF` from the audit.

**Bug fix rules:**
- Every fix must include a brief JSDoc or inline comment saying *what was wrong*
  only if the fix is non-obvious.
- If the fix changes observable behaviour, note it in your summary.

**Performance rules:**
- Memoise callbacks/values that are passed as props (`useCallback`, `useMemo`).
- Avoid creating new objects/arrays inside render unless necessary.
- Avoid re-subscribing effects by stabilising dependency arrays.
- Only optimise where the cost is real — don't litter the code with premature memo.

## Phase 5: Shallow-Code Hardening

For every module tagged `SHALLOW`:
- Add input validation / guards where callers can pass unexpected values.
- Add error handling for async operations (try/catch, fallback UI, user-facing error).
- Add cleanup in effects (unsubscribe, clear timers, abort controllers).
- Handle empty / null / undefined data gracefully in rendering.

## Phase 6: JSDoc for Design Decisions

Add JSDoc to:
- Every exported function/hook/component explaining **why it exists** and any
  non-obvious trade-offs. Keep it to 1–3 lines. Do NOT restate the signature.
- Module-level doc comments at the top of files that orchestrate multiple
  concerns (e.g., a storage service, a complex hook).
- Constants or magic numbers that encode domain knowledge.

**Anti-patterns — do NOT:**
- Add `/** Renders a button */` on a Button component — that's obvious.
- Narrate parameters that are already named clearly.
- Add JSDoc on every private helper — only on public API surface.

## Phase 7: Tests

Add or update tests for core functionality:

1. Identify the critical paths (data persistence, media handling, state transforms).
2. Write focused unit tests — one assertion per behaviour, descriptive names.
3. Mock external deps (AsyncStorage, FileSystem, expo-av) at the module boundary.
4. Do NOT test implementation details like internal state shape.
5. Aim for coverage of: happy path, one edge case, one error case per core function.

## Phase 8: Final Review

1. Run linter and fix any errors introduced during refactoring.
2. Verify no circular dependencies were created.
3. Verify barrel exports only re-export symbols that are actually consumed.
4. Summarise all changes in a concise list grouped by phase.

## Principles (apply throughout all phases)

- **DRY**: If the same logic exists in two places, extract it.
- **Single Responsibility**: Each file/function/hook does one thing.
- **Good Module Boundaries**: A module exposes a clear public API; internals stay private. Avoid God-files.
- **No Shallow Code**: Every async call has error handling. Every effect has cleanup. Every render handles missing data.
- **Singleton Services**: Services that manage global state (storage, media) should be singleton modules, not classes instantiated per-component.
- **Types Over Runtime Checks**: Prefer TypeScript's type system to prevent invalid states rather than runtime `if` checks where possible.
