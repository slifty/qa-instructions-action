import * as core from "@actions/core";
import { GITHUB_MODELS_BASE_URL } from "./constants.js";
import type { AiProvider } from "./types.js";

interface GitHubModelsChoice {
	message?: {
		content: string | null;
	};
}

interface GitHubModelsResponse {
	choices: GitHubModelsChoice[];
}

export function createGitHubModelsProvider(
	token: string,
	model: string,
): AiProvider {
	return {
		async generateQAInstructions(
			systemPrompt: string,
			userPrompt: string,
		): Promise<string> {
			const body = JSON.stringify({
				model,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: userPrompt },
				],
			});

			core.debug(`GitHub Models request body size: ${body.length} bytes`);

			const response = await fetch(GITHUB_MODELS_BASE_URL, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body,
			});

			if (!response.ok) {
				throw new Error(
					`GitHub Models API request failed: ${response.status} ${response.statusText}`,
				);
			}

			const data = (await response.json()) as GitHubModelsResponse;
			const content = data.choices[0]?.message?.content;
			if (!content) {
				throw new Error("No content in GitHub Models response");
			}

			return content;
		},
	};
}
