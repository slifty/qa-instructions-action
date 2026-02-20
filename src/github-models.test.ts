import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@actions/core");

import { createGitHubModelsProvider } from "./github-models.js";
import { GITHUB_MODELS_BASE_URL } from "./constants.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("createGitHubModelsProvider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("sends prompts to GitHub Models and returns content", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				choices: [{ message: { content: "## QA Instructions\n\nTest this." } }],
			}),
		});

		const provider = createGitHubModelsProvider("test-token", "openai/gpt-4o");
		const result = await provider.generateQAInstructions(
			"system prompt",
			"user prompt",
		);

		expect(result).toBe("## QA Instructions\n\nTest this.");
		expect(mockFetch).toHaveBeenCalledWith(GITHUB_MODELS_BASE_URL, {
			method: "POST",
			headers: {
				Authorization: "Bearer test-token",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				model: "openai/gpt-4o",
				messages: [
					{ role: "system", content: "system prompt" },
					{ role: "user", content: "user prompt" },
				],
			}),
		});
	});

	it("throws when response is not ok", async () => {
		mockFetch.mockResolvedValue({
			ok: false,
			status: 403,
			statusText: "Forbidden",
		});

		const provider = createGitHubModelsProvider("bad-token", "openai/gpt-4o");

		await expect(
			provider.generateQAInstructions("system", "user"),
		).rejects.toThrow("GitHub Models API request failed: 403 Forbidden");
	});

	it("throws when response has no content", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({
				choices: [{ message: { content: null } }],
			}),
		});

		const provider = createGitHubModelsProvider("test-token", "openai/gpt-4o");

		await expect(
			provider.generateQAInstructions("system", "user"),
		).rejects.toThrow("No content in GitHub Models response");
	});

	it("throws when response has no choices", async () => {
		mockFetch.mockResolvedValue({
			ok: true,
			json: async () => ({ choices: [] }),
		});

		const provider = createGitHubModelsProvider("test-token", "openai/gpt-4o");

		await expect(
			provider.generateQAInstructions("system", "user"),
		).rejects.toThrow("No content in GitHub Models response");
	});
});
