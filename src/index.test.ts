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
vi.mock("./claude.js");
vi.mock("./comment.js");

import { DEFAULT_MODEL } from "./constants.js";
import * as ghModule from "./github.js";
import * as contextBuilder from "./context-builder.js";
import * as claude from "./claude.js";
import * as comment from "./comment.js";

describe("run", () => {
	beforeEach(() => {
		vi.resetAllMocks();

		vi.mocked(core.getInput).mockImplementation((name: string) => {
			const inputs: Record<string, string> = {
				"github-token": "fake-token",
				"anthropic-api-key": "fake-api-key",
				prompt: "",
				model: "",
			};
			return inputs[name] ?? "";
		});

		vi.mocked(github.getOctokit).mockReturnValue(
			"mock-octokit" as unknown as ReturnType<typeof github.getOctokit>,
		);

		vi.mocked(ghModule.getPRMetadata).mockResolvedValue({
			title: "Test PR",
			body: "Test body",
			headSha: "abc123",
		});
		vi.mocked(ghModule.getPRDiff).mockResolvedValue("diff content");
		vi.mocked(ghModule.getChangedFiles).mockResolvedValue([]);
		vi.mocked(ghModule.getFileTree).mockResolvedValue(["src/index.ts"]);
		vi.mocked(ghModule.getPRCommits).mockResolvedValue([
			{ sha: "abc123", message: "commit" },
		]);
		vi.mocked(contextBuilder.buildPromptContext).mockReturnValue(
			"prompt context",
		);
		vi.mocked(claude.generateQAInstructions).mockResolvedValue(
			"QA instructions",
		);
		vi.mocked(comment.postOrUpdateComment).mockResolvedValue();
	});

	it("orchestrates the full flow and sets output", async () => {
		await run();

		expect(github.getOctokit).toHaveBeenCalledWith("fake-token");
		expect(ghModule.getPRMetadata).toHaveBeenCalledWith(
			"mock-octokit",
			"test-owner",
			"test-repo",
			42,
		);
		expect(ghModule.getPRDiff).toHaveBeenCalled();
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
		expect(ghModule.getPRCommits).toHaveBeenCalled();
		expect(contextBuilder.buildPromptContext).toHaveBeenCalledWith(
			{
				metadata: { title: "Test PR", body: "Test body", headSha: "abc123" },
				diff: "diff content",
				changedFiles: [],
				fileTree: ["src/index.ts"],
				commits: [{ sha: "abc123", message: "commit" }],
			},
			"",
		);
		expect(claude.generateQAInstructions).toHaveBeenCalledWith(
			"fake-api-key",
			DEFAULT_MODEL,
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

	it("uses custom model when provided", async () => {
		vi.mocked(core.getInput).mockImplementation((name: string) => {
			const inputs: Record<string, string> = {
				"github-token": "fake-token",
				"anthropic-api-key": "fake-api-key",
				prompt: "",
				model: "claude-opus-4-20250514",
			};
			return inputs[name] ?? "";
		});

		await run();

		expect(claude.generateQAInstructions).toHaveBeenCalledWith(
			"fake-api-key",
			"claude-opus-4-20250514",
			"prompt context",
		);
	});

	it("fails when not a pull_request event", async () => {
		// Override the context to have no pull_request
		const contextAny = github.context as unknown as Record<string, unknown>;
		const originalPayload = contextAny.payload;
		contextAny.payload = {};

		await run();

		expect(core.setFailed).toHaveBeenCalledWith(
			expect.stringContaining("pull_request event"),
		);

		// Restore
		contextAny.payload = originalPayload;
	});

	it("calls setFailed when an error occurs", async () => {
		vi.mocked(ghModule.getPRMetadata).mockRejectedValue(new Error("API error"));

		await run();

		expect(core.setFailed).toHaveBeenCalledWith("API error");
	});
});
