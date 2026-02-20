import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider } from "./types.js";

export function createAnthropicProvider(
	apiKey: string,
	model: string,
): AiProvider {
	const client = new Anthropic({ apiKey });

	return {
		async generateQAInstructions(
			systemPrompt: string,
			userPrompt: string,
		): Promise<string> {
			const response = await client.messages.create({
				model,
				max_tokens: 4096,
				system: systemPrompt,
				messages: [{ role: "user", content: userPrompt }],
			});

			const textBlock = response.content.find((block) => block.type === "text");
			if (!textBlock || textBlock.type !== "text") {
				throw new Error("No text content in Claude response");
			}

			return textBlock.text;
		},
	};
}
