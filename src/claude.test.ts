import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
	return {
		default: class MockAnthropic {
			apiKey: string;
			messages = { create: mockCreate };
			constructor(opts: { apiKey: string }) {
				this.apiKey = opts.apiKey;
			}
		},
	};
});

import { createAnthropicProvider } from "./claude.js";
import { DEFAULT_ANTHROPIC_MODEL } from "./constants.js";

describe("createAnthropicProvider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("sends prompts to Claude and returns text response", async () => {
		mockCreate.mockResolvedValue({
			content: [{ type: "text", text: "## QA Instructions\n\nTest this." }],
		});

		const provider = createAnthropicProvider(
			"test-api-key",
			DEFAULT_ANTHROPIC_MODEL,
		);
		const result = await provider.generateQAInstructions(
			"system prompt",
			"user prompt",
		);

		expect(result).toBe("## QA Instructions\n\nTest this.");
		expect(mockCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				model: DEFAULT_ANTHROPIC_MODEL,
				max_tokens: 4096,
				system: "system prompt",
				messages: [{ role: "user", content: "user prompt" }],
			}),
		);
	});

	it("throws when response has no text content", async () => {
		mockCreate.mockResolvedValue({
			content: [],
		});

		const provider = createAnthropicProvider("key", "model");

		await expect(
			provider.generateQAInstructions("system", "user"),
		).rejects.toThrow("No text content in Claude response");
	});
});
