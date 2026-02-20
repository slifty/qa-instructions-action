# QA Instructions Action

[![CI](https://github.com/slifty/qa-instructions-action/actions/workflows/ci.yml/badge.svg)](https://github.com/slifty/qa-instructions-action/actions/workflows/ci.yml)

A GitHub Action that automatically generates QA testing instructions for pull requests using Claude. On each PR push, it gathers context about the changes and posts (or updates) a comment with structured testing instructions.

## Usage

```yaml
name: QA Instructions
on:
  pull_request:
    types: [opened, synchronize]

permissions:
  pull-requests: write

jobs:
  qa-instructions:
    runs-on: ubuntu-latest
    steps:
      - uses: slifty/qa-instructions-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

**Requirements:**

- `permissions: pull-requests: write` is required for posting PR comments
- `ANTHROPIC_API_KEY` must be stored as a repository secret
- The `synchronize` event type triggers on each push, updating the existing comment

## Inputs

| Input               | Description                                 | Required | Default                      |
| ------------------- | ------------------------------------------- | -------- | ---------------------------- |
| `github-token`      | GitHub token for API access                 | Yes      | `${{ github.token }}`        |
| `anthropic-api-key` | Anthropic API key for Claude                | Yes      | —                            |
| `prompt`            | Optional custom instructions for the prompt | No       | `""`                         |
| `model`             | Claude model to use                         | No       | `claude-sonnet-4-5-20250929` |

## Outputs

| Output         | Description                   |
| -------------- | ----------------------------- |
| `instructions` | The generated QA instructions |

## How It Works

1. Gathers PR context: metadata, diff, changed file contents, repository file tree, and commit history
2. Builds a structured prompt with tiered truncation to fit within model context limits
3. Sends the prompt to Claude, which generates QA instructions covering:
   - Summary of changes
   - Test environment setup
   - Specific test scenarios with steps and expected results
   - Regression risks
   - Things to watch for
4. Posts (or updates) the instructions as a PR comment, identified by a hidden HTML marker

## Development

### Setup

```bash
npm install
```

### Scripts

| Command                   | Description                            |
| ------------------------- | -------------------------------------- |
| `npm run build`           | Compile TypeScript and bundle with ncc |
| `npm test`                | Run unit tests via Vitest              |
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
