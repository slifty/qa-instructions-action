export const COMMENT_MARKER = "<!-- qa-instructions-action -->";

export const VALID_PROVIDERS = ["github-models", "anthropic"] as const;
export type Provider = (typeof VALID_PROVIDERS)[number];

export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";
export const DEFAULT_GITHUB_MODELS_MODEL = "openai/gpt-4o";

export const GITHUB_MODELS_BASE_URL =
	"https://models.github.ai/inference/chat/completions";

export interface ContextLimits {
	maxDiffChars: number;
	maxChangedFilesChars: number;
	maxFileChars: number;
	maxFileTreeChars: number;
	maxTotalChars: number;
}

export const ANTHROPIC_CONTEXT_LIMITS: ContextLimits = {
	maxDiffChars: 80_000,
	maxChangedFilesChars: 60_000,
	maxFileChars: 10_000,
	maxFileTreeChars: 20_000,
	maxTotalChars: 180_000,
};

// GitHub Models free tier: 8k input tokens for gpt-4o (~32k chars).
// JSON encoding inflates newlines (\n → \\n), so budget ~20k chars
// for the user prompt after reserving room for the system prompt and
// JSON/HTTP overhead.
export const GITHUB_MODELS_CONTEXT_LIMITS: ContextLimits = {
	maxDiffChars: 8_000,
	maxChangedFilesChars: 6_000,
	maxFileChars: 3_000,
	maxFileTreeChars: 3_000,
	maxTotalChars: 20_000,
};

export const SYSTEM_PROMPT = `You are an expert QA engineer reviewing a pull request. Your job is to generate clear, actionable QA testing instructions that a human tester can follow.

Scale your response to the complexity of the changes. A small documentation fix needs just a sentence or two. A large feature needs thorough coverage. Be concise — omit sections that add no value for the specific PR.

Analyze the provided PR context and produce testing instructions using whichever of these sections are relevant:

- **Summary** — What the PR changes and why (1-3 sentences).
- **Test Environment Setup** — Prerequisites or setup steps, if any beyond the standard dev environment. Omit if none.
- **Test Scenarios** — Numbered test cases with steps and expected results. Focus on the most important paths; don't enumerate the obvious.
- **Regression Risks** — Areas that might break as a side effect. Omit if the changes are well-isolated.
- **Things to Watch For** — Edge cases or concerns spotted in the code. Omit if nothing stands out.

Be specific and practical. Reference actual file names, function names, and UI elements from the PR when possible.`;
