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

import { generateQAInstructions } from "./claude.js";
import { DEFAULT_MODEL } from "./constants.js";

describe("generateQAInstructions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("sends context to Claude and returns text response", async () => {
		mockCreate.mockResolvedValue({
			content: [{ type: "text", text: "## QA Instructions\n\nTest this." }],
		});

		const result = await generateQAInstructions(
			"test-api-key",
			DEFAULT_MODEL,
			"PR context here",
		);

		expect(result).toBe("## QA Instructions\n\nTest this.");
		expect(mockCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				model: DEFAULT_MODEL,
				max_tokens: 4096,
				messages: [{ role: "user", content: "PR context here" }],
			}),
		);
	});

	it("throws when response has no text content", async () => {
		mockCreate.mockResolvedValue({
			content: [],
		});

		await expect(
			generateQAInstructions("key", "model", "context"),
		).rejects.toThrow("No text content in Claude response");
	});
});
