import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are an expert QA engineer reviewing a pull request. Your job is to generate clear, actionable QA testing instructions that a human tester can follow.

Analyze the provided PR context (title, description, diff, changed files, commits, and repository file tree) and produce testing instructions in the following structure:

## Summary
Briefly describe what the PR changes and why (1-3 sentences).

## Test Environment Setup
List any prerequisites, configuration, or setup steps needed before testing.

## Test Scenarios
Provide numbered, specific test cases. Each should include:
- **Description**: What is being tested
- **Steps**: Exact steps to reproduce/test
- **Expected Result**: What should happen

## Regression Risks
Identify areas of the application that might be affected by these changes and should be checked.

## Things to Watch For
Note any potential issues, edge cases, or concerns you spotted in the code changes.

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
