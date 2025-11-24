# Repository Guidelines

## Project Structure & Module Organization
- `src/app/` — App Router entrypoints (`layout.tsx`, `page.tsx`) and route segments.
- `public/` — Static assets (SVGs, icons). Served at site root.
- `doc/` — Requirements, wireframes, legacy docs (`doc/requirements/*`, `doc/old/*`).
- Root configs — `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`.

Suggested additions when expanding:
- `src/components/` for shared UI, `src/lib/` for utilities, `src/styles/` for CSS if needed.

## Build, Test, and Development Commands
- `yarn dev` — Run the app locally at http://localhost:3000.
- `yarn build` — Production build (type-checks and optimizations).
- `yarn start` — Start the built app.
- `yarn lint` — Lint with ESLint; use `--fix` to auto-fix.

Note: No test script is configured yet. If adding tests, prefer `yarn test` with your chosen runner.

## Coding Style & Naming Conventions
- TypeScript first; 2-space indent; avoid unused exports.
- React components: PascalCase (e.g., `TimerPanel.tsx`).
- Functions/variables: camelCase; constants: UPPER_SNAKE_CASE.
- App Router files follow Next.js conventions: `page.tsx`, `layout.tsx`, route folders in kebab-case.
- Styling: Tailwind CSS v4 via `globals.css`/PostCSS. Prefer utility classes; keep custom CSS minimal.
- Run `yarn lint --fix` before pushing.

## Testing Guidelines
- Currently no framework configured. When introducing tests:
  - Place unit/component tests near source or under `src/__tests__/`.
  - Name files `*.test.ts`/`*.test.tsx`.
  - Aim for fast, isolated tests and add minimal fixtures.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`). Keep messages imperative and scoped.
- PRs should include:
  - Purpose/background and linked issues (e.g., `Closes #123`).
  - Summary of changes and user impact.
  - Runbook: commands to verify (`yarn dev`, pages to open).
  - Screenshots/GIFs for UI changes.
  - Checklist: lint/build pass; breaking changes noted.

## Security & Configuration Tips
- Do not commit secrets. Use `.env.local` for local secrets; prefix client-exposed vars with `NEXT_PUBLIC_`.
- Keep dependencies minimal; prefer native Web APIs and small utilities.
- Large new features should include a brief note in `doc/` (architecture, trade-offs).

