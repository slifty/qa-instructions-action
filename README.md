# QA Instructions Action

[![CI](https://github.com/BadIdeaFactory/qa-instructions-action/actions/workflows/ci.yml/badge.svg)](https://github.com/BadIdeaFactory/qa-instructions-action/actions/workflows/ci.yml)

A GitHub Action that automatically generates QA testing instructions for pull requests using AI. On each PR push, it gathers context about the changes and posts (or updates) a comment with structured testing instructions.

Supports two AI providers:

- **GitHub Models** (default) — uses the GitHub Models inference API with your existing `GITHUB_TOKEN`. No API keys or subscriptions required.
- **Anthropic** — uses the Anthropic API with a Claude model. Requires an API key.

## Usage

### GitHub Models (default)

```yaml
name: QA Instructions
on:
  pull_request:
    types: [opened, synchronize]

permissions:
  pull-requests: write
  models: read

jobs:
  qa-instructions:
    runs-on: ubuntu-latest
    steps:
      - uses: BadIdeaFactory/qa-instructions-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

**Requirements:**

- `permissions: models: read` is required for GitHub Models API access
- `permissions: pull-requests: write` is required for posting PR comments
- The `synchronize` event type triggers on each push, updating the existing comment

### Anthropic

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
      - uses: BadIdeaFactory/qa-instructions-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          provider: anthropic
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

**Requirements:**

- `ANTHROPIC_API_KEY` must be stored as a repository secret
- `permissions: pull-requests: write` is required for posting PR comments

## Inputs

| Input               | Description                                                  | Required | Default               |
| ------------------- | ------------------------------------------------------------ | -------- | --------------------- |
| `github-token`      | GitHub token for API access and GitHub Models authentication | Yes      | `${{ github.token }}` |
| `provider`          | AI provider: `"github-models"` or `"anthropic"`              | No       | `"github-models"`     |
| `anthropic-api-key` | Anthropic API key (required when provider is `"anthropic"`)  | No       | `""`                  |
| `prompt`            | Optional custom instructions appended to the prompt          | No       | `""`                  |
| `model`             | AI model to use (defaults to a provider-appropriate model)   | No       | `""`                  |

### Default models

| Provider        | Default model                |
| --------------- | ---------------------------- |
| `github-models` | `openai/gpt-4o`              |
| `anthropic`     | `claude-sonnet-4-5-20250929` |

You can override the model with any model supported by the chosen provider.

## Outputs

| Output         | Description                   |
| -------------- | ----------------------------- |
| `instructions` | The generated QA instructions |

## How It Works

1. Gathers PR context: metadata, diff, changed file contents, repository file tree, and commit history
2. Builds a structured prompt with tiered truncation to fit within model context limits
3. Sends the prompt to the configured AI provider, which generates QA instructions covering:
   - Summary of changes
   - Test environment setup
   - Specific test scenarios with steps and expected results
   - Regression risks
   - Things to watch for
4. Posts (or updates) the instructions as a PR comment, identified by a hidden HTML marker

## Troubleshooting

### GitHub Models returns 403 Forbidden

If you see a 403 error when using the `github-models` provider, GitHub Models may be disabled at the organization level. GitHub Models uses a hierarchical access control system:

1. **Enterprise level** — An enterprise owner must enable GitHub Models for the enterprise (if your organization is part of an enterprise)
2. **Organization level** — An organization owner must enable GitHub Models for the organization
3. **Workflow level** — Your workflow must declare `permissions: models: read` (already in the example above)

**To enable GitHub Models for your organization:**

An organization owner needs to:

1. Navigate to your organization's **Settings**
2. Go to **Code, planning, and automation** → **Models** → **Development**
3. Enable GitHub Models for the organization

**Alternative workaround:**

If you cannot enable GitHub Models at the organization level, switch to the Anthropic provider:

```yaml
- uses: BadIdeaFactory/qa-instructions-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    provider: anthropic
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

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

This project follows a policy of using the active Node.js version supported by GitHub Actions. The Node version is defined in `.node-version` and must match the `runs.using` runtime in `action.yml`. GitHub Actions only supports specific Node runtimes (`node20`, `node24`, etc.).

When updating to a new Node version, change all four locations together:

1. `.node-version`
2. `action.yml` → `runs.using`
3. `@types/node` version in `package.json`
4. `@tsconfig/nodeXX` version in `package.json` and `tsconfig.json`

**Current version: Node 24**

### Making Changes

1. Edit TypeScript source in `src/`
2. Run `npm run format` and `npm run lint`
3. Commit your source changes (do **not** commit `dist/` — it is gitignored)

### Releasing

1. Create a GitHub release with a semver tag (e.g., `v1.0.0`)
2. The release workflow automatically builds and pushes the bundled action to a major version tag (e.g., `v1`)

## License

AGPL-3.0
