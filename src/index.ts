import * as core from "@actions/core";
import * as github from "@actions/github";
import { DEFAULT_MODEL } from "./constants.js";
import {
	getPRMetadata,
	getPRDiff,
	getChangedFiles,
	getFileTree,
	getPRCommits,
} from "./github.js";
import { buildPromptContext } from "./context-builder.js";
import { generateQAInstructions } from "./claude.js";
import { postOrUpdateComment } from "./comment.js";

export async function run(): Promise<void> {
	try {
		core.info("QA Instructions Action is running!");

		const token = core.getInput("github-token", { required: true });
		const anthropicApiKey = core.getInput("anthropic-api-key", {
			required: true,
		});
		const customPrompt = core.getInput("prompt");
		const model = core.getInput("model") || DEFAULT_MODEL;

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

		// Fetch PR metadata first (need headSha for file tree)
		core.info("Fetching PR metadata...");
		const metadata = await getPRMetadata(octokit, owner, repo, pullNumber);

		// Fetch remaining data in parallel
		core.info("Fetching PR diff, changed files, file tree, and commits...");
		const [diff, changedFiles, fileTree, commits] = await Promise.all([
			getPRDiff(octokit, owner, repo, pullNumber),
			getChangedFiles(octokit, owner, repo, pullNumber),
			getFileTree(octokit, owner, repo, metadata.headSha),
			getPRCommits(octokit, owner, repo, pullNumber),
		]);

		// Build prompt context
		core.info("Building prompt context...");
		const promptContext = buildPromptContext(
			{ metadata, diff, changedFiles, fileTree, commits },
			customPrompt,
		);

		// Generate QA instructions via Claude
		core.info("Generating QA instructions...");
		const instructions = await generateQAInstructions(
			anthropicApiKey,
			model,
			promptContext,
		);

		// Post or update PR comment
		core.info("Posting QA instructions as PR comment...");
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
