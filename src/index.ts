import * as core from "@actions/core";
import * as github from "@actions/github";
import { SYSTEM_PROMPT, VALID_PROVIDERS } from "./constants.js";
import type { Provider } from "./constants.js";
import {
	getPrMetadata,
	getPrDiff,
	getChangedFiles,
	getFileTree,
	getPrCommits,
} from "./github.js";
import { buildPromptContext } from "./context-builder.js";
import { createProvider, getContextLimits } from "./provider-factory.js";
import { postOrUpdateComment } from "./comment.js";

export async function run(): Promise<void> {
	try {
		core.info("QA Instructions Action is running!");

		const token = core.getInput("github-token", { required: true });
		const provider = core.getInput("provider") || "github-models";
		const anthropicApiKey = core.getInput("anthropic-api-key");
		const customPrompt = core.getInput("prompt");
		const model = core.getInput("model");

		const pullRequest = github.context.payload.pull_request;
		if (!pullRequest) {
			core.setFailed(
				"This action must be run on a pull_request event. " +
					"Add `on: pull_request` to your workflow.",
			);
			return;
		}
		const pullNumber = pullRequest.number as number;
		const { owner, repo } = github.context.repo;

		const octokit = github.getOctokit(token);

		if (!VALID_PROVIDERS.includes(provider as Provider)) {
			core.setFailed(
				`Invalid provider "${provider}". Must be one of: ${VALID_PROVIDERS.join(", ")}`,
			);
			return;
		}
		const validatedProvider = provider as Provider;

		const aiProvider = createProvider({
			provider: validatedProvider,
			model,
			anthropicApiKey,
			githubToken: token,
			octokit,
		});
		const contextLimits = getContextLimits(validatedProvider);

		// Fetch Pr metadata first (need headSha for file tree)
		core.info("Fetching Pr metadata...");
		const metadata = await getPrMetadata(octokit, owner, repo, pullNumber);

		// Fetch remaining data in parallel
		core.info("Fetching Pr diff, changed files, file tree, and commits...");
		const [diff, changedFiles, fileTree, commits] = await Promise.all([
			getPrDiff(octokit, owner, repo, pullNumber),
			getChangedFiles(octokit, owner, repo, pullNumber, metadata.headSha),
			getFileTree(octokit, owner, repo, metadata.headSha),
			getPrCommits(octokit, owner, repo, pullNumber),
		]);

		// Build prompt context
		core.info("Building prompt context...");
		const promptContext = buildPromptContext(
			{ metadata, diff, changedFiles, fileTree, commits },
			customPrompt,
			contextLimits,
		);

		// Generate QA instructions via AI provider
		core.info("Generating QA instructions...");
		const instructions = await aiProvider.generateQAInstructions(
			SYSTEM_PROMPT,
			promptContext,
		);

		// Post or update Pr comment
		core.info("Posting QA instructions as Pr comment...");
		await postOrUpdateComment(octokit, owner, repo, pullNumber, instructions);

		core.setOutput("instructions", instructions);
		core.info("QA Instructions Action completed successfully.");
	} catch (error) {
		if (error instanceof Error) {
			core.setFailed(error.message);
		} else {
			core.setFailed("An unexpected error occurred");
		}
	}
}

if (process.env["VITEST"] === undefined) {
	run();
}
