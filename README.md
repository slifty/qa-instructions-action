# QA Instructions Action

[![CI](https://github.com/slifty/qa-instructions-action/actions/workflows/ci.yml/badge.svg)](https://github.com/slifty/qa-instructions-action/actions/workflows/ci.yml)

A GitHub Action that writes QA instructions.

## Usage

```yaml
- uses: slifty/qa-instructions-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input          | Description                 | Required | Default               |
| -------------- | --------------------------- | -------- | --------------------- |
| `github-token` | GitHub token for API access | Yes      | `${{ github.token }}` |

## Outputs

| Output         | Description                   |
| -------------- | ----------------------------- |
| `instructions` | The generated QA instructions |

## Development

### Setup

```bash
npm install
```

### Scripts

| Command                   | Description                            |
| ------------------------- | -------------------------------------- |
| `npm run build`           | Compile TypeScript and bundle with ncc |
| `npm run lint`            | Run all linters (ESLint + Prettier)    |
| `npm run lint:eslint`     | Run ESLint                             |
| `npm run lint:prettier`   | Check Prettier formatting              |
| `npm run format`          | Auto-fix all (ESLint + Prettier)       |
| `npm run format:eslint`   | Auto-fix ESLint issues                 |
| `npm run format:prettier` | Format code with Prettier              |

### Node Version

The Node version is defined in `.node-version` and must match the `runs.using` runtime in `action.yml`. GitHub Actions only supports specific Node runtimes (`node20`, `node24`, etc.). When updating, change all three locations together:

1. `.node-version`
2. `action.yml` → `runs.using`
3. `@types/node` version in `package.json`

Currently using **Node 20**. GitHub plans to deprecate `node20` in favor of `node24` in March 2026.

### Making Changes

1. Edit TypeScript source in `src/`
2. Run `npm run format` and `npm run lint`
3. Commit your source changes (do **not** commit `dist/` — it is gitignored)

### Releasing

1. Create a GitHub release with a semver tag (e.g., `v1.0.0`)
2. The release workflow automatically builds and pushes the bundled action to a major version tag (e.g., `v1`)

## License

AGPL-3.0
