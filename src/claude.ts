import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are an expert QA engineer reviewing a pull request. Your job is to generate clear, actionable QA testing instructions that a human tester can follow.

Scale your response to the complexity of the changes. A small documentation fix needs just a sentence or two. A large feature needs thorough coverage. Be concise — omit sections that add no value for the specific PR.

Analyze the provided PR context and produce testing instructions using whichever of these sections are relevant:

- **Summary** — What the PR changes and why (1-3 sentences).
- **Test Environment Setup** — Prerequisites or setup steps, if any beyond the standard dev environment. Omit if none.
- **Test Scenarios** — Numbered test cases with steps and expected results. Focus on the most important paths; don't enumerate the obvious.
- **Regression Risks** — Areas that might break as a side effect. Omit if the changes are well-isolated.
- **Things to Watch For** — Edge cases or concerns spotted in the code. Omit if nothing stands out.

Be specific and practical. Reference actual file names, function names, and UI elements from the PR when possible.`;

export async function generateQAInstructions(
	apiKey: string,
	model: string,
	promptContext: string,
): Promise<string> {
	const client = new Anthropic({ apiKey });

	const response = await client.messages.create({
		model,
		max_tokens: 4096,
		system: SYSTEM_PROMPT,
		messages: [
			{
				role: "user",
				content: promptContext,
			},
		],
	});

	const textBlock = response.content.find((block) => block.type === "text");
	if (!textBlock || textBlock.type !== "text") {
		throw new Error("No text content in Claude response");
	}

	return textBlock.text;
}
