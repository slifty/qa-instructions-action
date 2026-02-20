import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./claude.js", () => ({
	createAnthropicProvider: vi.fn(() => ({
		generateQAInstructions: vi.fn(),
	})),
}));

vi.mock("./github-models.js", () => ({
	createGitHubModelsProvider: vi.fn(() => ({
		generateQAInstructions: vi.fn(),
	})),
}));

import {
	resolveModel,
	createProvider,
	getContextLimits,
} from "./provider-factory.js";
import {
	DEFAULT_ANTHROPIC_MODEL,
	DEFAULT_GITHUB_MODELS_MODEL,
	ANTHROPIC_CONTEXT_LIMITS,
	GITHUB_MODELS_CONTEXT_LIMITS,
} from "./constants.js";
import { createAnthropicProvider } from "./claude.js";
import { createGitHubModelsProvider } from "./github-models.js";
import type { Octokit } from "./types.js";

const mockOctokit = {} as unknown as Octokit;

describe("resolveModel", () => {
	it("returns the given model when non-empty", () => {
		expect(resolveModel("github-models", "custom-model")).toBe("custom-model");
		expect(resolveModel("anthropic", "custom-model")).toBe("custom-model");
	});

	it("returns default Anthropic model when model is empty", () => {
		expect(resolveModel("anthropic", "")).toBe(DEFAULT_ANTHROPIC_MODEL);
	});

	it("returns default GitHub Models model when model is empty", () => {
		expect(resolveModel("github-models", "")).toBe(DEFAULT_GITHUB_MODELS_MODEL);
	});
});

describe("getContextLimits", () => {
	it("returns Anthropic limits for anthropic provider", () => {
		expect(getContextLimits("anthropic")).toBe(ANTHROPIC_CONTEXT_LIMITS);
	});

	it("returns GitHub Models limits for github-models provider", () => {
		expect(getContextLimits("github-models")).toBe(
			GITHUB_MODELS_CONTEXT_LIMITS,
		);
	});
});

describe("createProvider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("creates a GitHub Models provider with default model", () => {
		createProvider({
			provider: "github-models",
			model: "",
			anthropicApiKey: "",
			githubToken: "test-token",
			octokit: mockOctokit,
		});

		expect(createGitHubModelsProvider).toHaveBeenCalledWith(
			"test-token",
			DEFAULT_GITHUB_MODELS_MODEL,
		);
	});

	it("creates an Anthropic provider with default model", () => {
		createProvider({
			provider: "anthropic",
			model: "",
			anthropicApiKey: "test-key",
			githubToken: "test-token",
			octokit: mockOctokit,
		});

		expect(createAnthropicProvider).toHaveBeenCalledWith(
			"test-key",
			DEFAULT_ANTHROPIC_MODEL,
		);
	});

	it("uses custom model when provided", () => {
		createProvider({
			provider: "anthropic",
			model: "claude-opus-4-20250514",
			anthropicApiKey: "test-key",
			githubToken: "test-token",
			octokit: mockOctokit,
		});

		expect(createAnthropicProvider).toHaveBeenCalledWith(
			"test-key",
			"claude-opus-4-20250514",
		);
	});

	it("throws for invalid provider", () => {
		expect(() =>
			createProvider({
				provider: "invalid",
				model: "",
				anthropicApiKey: "",
				githubToken: "test-token",
				octokit: mockOctokit,
			}),
		).toThrow(
			'Invalid provider "invalid". Must be one of: github-models, anthropic',
		);
	});

	it("throws when anthropic provider is used without API key", () => {
		expect(() =>
			createProvider({
				provider: "anthropic",
				model: "",
				anthropicApiKey: "",
				githubToken: "test-token",
				octokit: mockOctokit,
			}),
		).toThrow(
			'The "anthropic-api-key" input is required when provider is "anthropic"',
		);
	});
});
