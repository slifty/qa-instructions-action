import {
	VALID_PROVIDERS,
	DEFAULT_ANTHROPIC_MODEL,
	DEFAULT_GITHUB_MODELS_MODEL,
	ANTHROPIC_CONTEXT_LIMITS,
	GITHUB_MODELS_CONTEXT_LIMITS,
} from "./constants.js";
import type { Provider, ContextLimits } from "./constants.js";
import type { AiProvider, Octokit } from "./types.js";
import { createAnthropicProvider } from "./claude.js";
import { createGitHubModelsProvider } from "./github-models.js";

export interface ProviderConfig {
	provider: string;
	model: string;
	anthropicApiKey: string;
	githubToken: string;
	octokit: Octokit;
}

export function getContextLimits(provider: Provider): ContextLimits {
	return provider === "anthropic"
		? ANTHROPIC_CONTEXT_LIMITS
		: GITHUB_MODELS_CONTEXT_LIMITS;
}

export function resolveModel(provider: Provider, model: string): string {
	if (model) {
		return model;
	}
	return provider === "anthropic"
		? DEFAULT_ANTHROPIC_MODEL
		: DEFAULT_GITHUB_MODELS_MODEL;
}

export function createProvider(config: ProviderConfig): AiProvider {
	const { provider, model, anthropicApiKey, githubToken } = config;

	if (!VALID_PROVIDERS.includes(provider as Provider)) {
		throw new Error(
			`Invalid provider "${provider}". Must be one of: ${VALID_PROVIDERS.join(", ")}`,
		);
	}

	const resolvedProvider = provider as Provider;
	const resolvedModel = resolveModel(resolvedProvider, model);

	if (resolvedProvider === "anthropic") {
		if (!anthropicApiKey) {
			throw new Error(
				'The "anthropic-api-key" input is required when provider is "anthropic"',
			);
		}
		return createAnthropicProvider(anthropicApiKey, resolvedModel);
	}

	return createGitHubModelsProvider(githubToken, resolvedModel);
}
