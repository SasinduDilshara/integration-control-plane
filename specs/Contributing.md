# Contributing Guide

## Prerequisites

Java 17+, Ballerina 2201.13.1, Node.js 20+, pnpm 10+, Docker & Docker Compose (latest).
Quick start: `./gradlew build` → `docker-compose -f icp_server/docker-compose.local.yml up --build` → `cd frontend && pnpm install && pnpm dev`.
Backend: `https://localhost:9445` | Frontend: `http://localhost:5173` | Login: `admin`/`admin`.

## General Rules

**Do NOT:** add comments/docstrings/annotations to unchanged code; refactor surrounding code; add error handling for impossible scenarios; create files unless necessary; add dependencies without approval; modify CI/Gradle without approval; over-engineer (no premature abstractions, feature flags, compat shims); add `// removed` placeholders; rename unused vars to `_` (delete instead); create fallback tests with mock data.
**Do:** keep changes minimal and focused; follow existing patterns; promote reusability; define constants; read relevant specs first.

## Naming

Ballerina: `snake_case.bal`. TypeScript: `camelCase.ts`. React components: `PascalCase.tsx`. SQL: `snake_case.sql`.
Ballerina identifiers — functions: `camelCase`, types/records: `PascalCase`, constants: `UPPER_SNAKE_CASE`.

## Backend Rules (Ballerina)

- One service per top-level `.bal` file bound to a port. One `*_repository.bal` per entity in `modules/storage/`.
- Types in `modules/types/` only. Auth checks via `modules/auth/permission_checker.bal`.
- All configurables in `config.bal` with defaults. Use `$secret{alias}` for encrypted values; code outside `config.bal` uses `resolved*` vars.
- Error handling: use `check` keyword, `error` type, `classifySqlError()` from `error_mapper.bal`. Never expose raw SQL errors.
- DB: parameterized queries only. Use `database_dialect.bal` for vendor-specific SQL. No inline DB-specific SQL.

## Frontend Rules (React + TypeScript)

**Read `frontend/HOUSE_RULES.md` before any frontend change.** Stack: React 19, TS 5, Vite 7, Oxygen UI (MUI), Router v7, TanStack Query v5.
1. Always handle Loading → Error → Not Found → Empty → Data (early return). 2. All URL paths in `src/paths.ts` only. 3. No `Box` spam — use semantic components. 4. No trivial null ignoring (`?? ""`, `!.`). 5. No unnecessary `useEffect`. 6. Run `npx prettier --check .` before submitting.
UI: `@wso2/oxygen-ui` only. API: GraphQL in `src/api/`, TanStack Query hooks.

## Database Changes

1. Update ALL 4 dialect init scripts in `icp_server/resources/db/init-scripts/` (mysql, postgresql, mssql, h2).
2. Update credentials DB scripts if auth-related. 3. Add migration SQL in `migration-scripts/`.
4. Update `*_repository.bal` in `modules/storage/`. 5. Update types in `modules/types/`.

## Git & PR Process

Commit style: short imperative sentences, no prefixes (`feat:`, `fix:`). PRs squash-merged to `main`.
**Checklist:** `./gradlew build` passes; `npx prettier --check .` passes; `bal test` passes; `pnpm test` passes; PR template (`pull_request_template.md`) filled; no secrets in code; WSO2 secure coding standards followed.
PR sections: Purpose (link issues), Goals, Approach (screenshots for UI), User stories, Release note, Docs, Tests, Security.

## Security & License

Never log PII/secrets/tokens/credentials. Do not expose internal error details in 5xx responses.
Apache 2.0 — all new files must include the WSO2 copyright header (see existing files for format).
