# QA Instructions Action

A GitHub Action (TypeScript + Node 20) that generates QA instructions.

## Build Commands

- `npm test` — run unit tests via Vitest
- `npm run build` — compile TypeScript and bundle into `dist/index.js`
- `npm run lint` — run all linters (ESLint + Prettier check)
- `npm run lint:eslint` — run ESLint
- `npm run lint:prettier` — check Prettier formatting
- `npm run format` — auto-fix all (ESLint + Prettier)
- `npm run format:eslint` — auto-fix ESLint issues
- `npm run format:prettier` — format with Prettier

## Key Conventions

- **Do NOT commit `dist/`** — it is gitignored. The release workflow builds and publishes the bundled output automatically when a GitHub release is created.
- **Strict TypeScript** — `tsconfig.json` has `strict: true`. Do not use `any` without justification.
- **Lint and format before committing** — run `npm run lint` and `npm run format:check` before creating a commit.
- **Source lives in `src/`** — all TypeScript source code is in the `src/` directory. The `lib/` directory is intermediate compiler output and is git-ignored.
- **Node version** — defined in `.node-version` and must match the `runs.using` runtime in `action.yml`. When updating Node, change `.node-version`, `action.yml` (`runs.using`), and `@types/node` in `package.json` together.
