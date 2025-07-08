# AGENTS.md - Server Manager Development Guide

## Build/Lint/Test Commands
- **Root**: `pnpm dev` (all), `pnpm build` (all), `pnpm clean`
- **Backend**: `pnpm --filter backend test` (Jest), `pnpm --filter backend lint` (ESLint), `pnpm --filter backend format` (Prettier)
- **Frontend**: `pnpm --filter ui test` (Vitest), `pnpm --filter ui test:watch`, `pnpm --filter ui lint`
- **Single test**: `pnpm --filter backend jest -- --testNamePattern="test name"` or `pnpm --filter ui vitest -- -t "test name"`

## Package Manager
- Use **pnpm workspaces** exclusively, never npm/yarn
- Filter commands: `pnpm --filter <package-name> <command>`

## Code Style & Conventions
- **TypeScript**: Strict mode enabled, use shared types from `@server-manager/shared`
- **Imports**: Use absolute imports with `@/` alias (frontend), relative for backend
- **Types**: Define interfaces in `packages/shared/src/types/`, use Zod for validation
- **Naming**: camelCase for variables/functions, PascalCase for components/interfaces
- **Error handling**: Use try/catch with logger, return proper HTTP status codes
- **Comments**: JSDoc for public APIs, avoid inline comments unless complex logic

## Testing
- **Backend**: Jest + Supertest, files in `__tests__/` directories  
- **Frontend**: Vitest + React Testing Library + MSW for API mocking
- **Shared**: Test Zod schemas and utilities in shared package