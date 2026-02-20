import { describe, it, expect, vi, beforeEach } from "vitest";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { run } from "./index.js";

vi.mock("@actions/core");
vi.mock("@actions/github", () => ({
	context: {
		payload: { pull_request: { number: 42 } },
		repo: { owner: "test-owner", repo: "test-repo" },
	},
	getOctokit: vi.fn(),
}));
vi.mock("./github.js");
vi.mock("./context-builder.js");
vi.mock("./provider-factory.js");
vi.mock("./comment.js");

import * as ghModule from "./github.js";
import * as contextBuilder from "./context-builder.js";
import * as providerFactory from "./provider-factory.js";
import * as comment from "./comment.js";
import { GITHUB_MODELS_CONTEXT_LIMITS } from "./constants.js";

const mockGenerateQAInstructions = vi.fn();

describe("run", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		vi.mocked(core.getInput).mockImplementation((name: string) => {
			const inputs: Record<string, string> = {
				"github-token": "fake-token",
				"anthropic-api-key": "",
				provider: "github-models",
				prompt: "",
				model: "",
			};
			return inputs[name] ?? "";
		});

		vi.mocked(github.getOctokit).mockReturnValue(
			"mock-octokit" as unknown as ReturnType<typeof github.getOctokit>,
		);

		mockGenerateQAInstructions.mockResolvedValue("QA instructions");
		vi.mocked(providerFactory.createProvider).mockReturnValue({
			generateQAInstructions: mockGenerateQAInstructions,
		});
		vi.mocked(providerFactory.getContextLimits).mockReturnValue(
			GITHUB_MODELS_CONTEXT_LIMITS,
		);

		vi.mocked(ghModule.getPrMetadata).mockResolvedValue({
			title: "Test PR",
			body: "Test body",
			headSha: "abc123",
		});
		vi.mocked(ghModule.getPrDiff).mockResolvedValue("diff content");
		vi.mocked(ghModule.getChangedFiles).mockResolvedValue([]);
		vi.mocked(ghModule.getFileTree).mockResolvedValue(["src/index.ts"]);
		vi.mocked(ghModule.getPrCommits).mockResolvedValue([
			{ sha: "abc123", message: "commit" },
		]);
		vi.mocked(contextBuilder.buildPromptContext).mockReturnValue(
			"prompt context",
		);
		vi.mocked(comment.postOrUpdateComment).mockResolvedValue();
	});

	it("orchestrates the full flow and sets output", async () => {
		await run();

		expect(github.getOctokit).toHaveBeenCalledWith("fake-token");
		expect(providerFactory.createProvider).toHaveBeenCalledWith({
			provider: "github-models",
			model: "",
			anthropicApiKey: "",
			githubToken: "fake-token",
			octokit: "mock-octokit",
		});
		expect(providerFactory.getContextLimits).toHaveBeenCalledWith(
			"github-models",
		);
		expect(ghModule.getPrMetadata).toHaveBeenCalledWith(
			"mock-octokit",
			"test-owner",
			"test-repo",
			42,
		);
		expect(ghModule.getPrDiff).toHaveBeenCalled();
		expect(ghModule.getChangedFiles).toHaveBeenCalledWith(
			"mock-octokit",
			"test-owner",
			"test-repo",
			42,
			"abc123",
		);
		expect(ghModule.getFileTree).toHaveBeenCalledWith(
			"mock-octokit",
			"test-owner",
			"test-repo",
			"abc123",
		);
		expect(ghModule.getPrCommits).toHaveBeenCalled();
		expect(contextBuilder.buildPromptContext).toHaveBeenCalledWith(
			{
				metadata: { title: "Test PR", body: "Test body", headSha: "abc123" },
				diff: "diff content",
				changedFiles: [],
				fileTree: ["src/index.ts"],
				commits: [{ sha: "abc123", message: "commit" }],
			},
			"",
			GITHUB_MODELS_CONTEXT_LIMITS,
		);
		expect(mockGenerateQAInstructions).toHaveBeenCalledWith(
			expect.any(String),
			"prompt context",
		);
		expect(comment.postOrUpdateComment).toHaveBeenCalledWith(
			"mock-octokit",
			"test-owner",
			"test-repo",
			42,
			"QA instructions",
		);
		expect(core.setOutput).toHaveBeenCalledWith(
			"instructions",
			"QA instructions",
		);
	});

	it("passes anthropic provider and API key when configured", async () => {
		vi.mocked(core.getInput).mockImplementation((name: string) => {
			const inputs: Record<string, string> = {
				"github-token": "fake-token",
				"anthropic-api-key": "fake-api-key",
				provider: "anthropic",
				prompt: "",
				model: "claude-opus-4-20250514",
			};
			return inputs[name] ?? "";
		});

		await run();

		expect(providerFactory.createProvider).toHaveBeenCalledWith({
			provider: "anthropic",
			model: "claude-opus-4-20250514",
			anthropicApiKey: "fake-api-key",
			githubToken: "fake-token",
			octokit: "mock-octokit",
		});
	});

	it("defaults provider to github-models when input is empty", async () => {
		vi.mocked(core.getInput).mockImplementation((name: string) => {
			const inputs: Record<string, string> = {
				"github-token": "fake-token",
				"anthropic-api-key": "",
				provider: "",
				prompt: "",
				model: "",
			};
			return inputs[name] ?? "";
		});

		await run();

		expect(providerFactory.createProvider).toHaveBeenCalledWith(
			expect.objectContaining({ provider: "github-models" }),
		);
	});

	it("fails when not a pull_request event", async () => {
		const contextAny = github.context as unknown as Record<string, unknown>;
		const originalPayload = contextAny.payload;
		contextAny.payload = {};

		await run();

		expect(core.setFailed).toHaveBeenCalledWith(
			expect.stringContaining("pull_request event"),
		);

		contextAny.payload = originalPayload;
	});

	it("fails for invalid provider", async () => {
		vi.mocked(core.getInput).mockImplementation((name: string) => {
			const inputs: Record<string, string> = {
				"github-token": "fake-token",
				"anthropic-api-key": "",
				provider: "bad",
				prompt: "",
				model: "",
			};
			return inputs[name] ?? "";
		});

		await run();

		expect(core.setFailed).toHaveBeenCalledWith(
			expect.stringContaining('Invalid provider "bad"'),
		);
		expect(providerFactory.createProvider).not.toHaveBeenCalled();
	});

	it("calls setFailed when an error occurs", async () => {
		vi.mocked(ghModule.getPrMetadata).mockRejectedValue(new Error("API error"));

		await run();

		expect(core.setFailed).toHaveBeenCalledWith("API error");
	});
});
