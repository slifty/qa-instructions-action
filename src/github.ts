import * as core from "@actions/core";
import type { Octokit, PRMetadata, FileContent, CommitInfo } from "./types.js";

export async function getPRMetadata(
	octokit: Octokit,
	owner: string,
	repo: string,
	pullNumber: number,
): Promise<PRMetadata> {
	const { data } = await octokit.rest.pulls.get({
		owner,
		repo,
		pull_number: pullNumber,
	});
	return {
		title: data.title,
		body: data.body ?? "",
		headSha: data.head.sha,
	};
}

export async function getPRDiff(
	octokit: Octokit,
	owner: string,
	repo: string,
	pullNumber: number,
): Promise<string> {
	const { data } = await octokit.rest.pulls.get({
		owner,
		repo,
		pull_number: pullNumber,
		mediaType: { format: "diff" },
	});
	// Octokit returns a string when diff format is requested, but types say object
	return data as unknown as string;
}

export async function getChangedFiles(
	octokit: Octokit,
	owner: string,
	repo: string,
	pullNumber: number,
	headSha: string,
): Promise<FileContent[]> {
	const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
		owner,
		repo,
		pull_number: pullNumber,
	});

	const results: FileContent[] = [];

	for (const file of files) {
		if (file.status === "removed") continue;

		try {
			const { data } = await octokit.rest.repos.getContent({
				owner,
				repo,
				path: file.filename,
				ref: headSha,
			});

			if ("content" in data && typeof data.content === "string") {
				const content = Buffer.from(data.content, "base64").toString("utf-8");
				results.push({ filename: file.filename, content });
			}
		} catch {
			core.warning(`Could not fetch content for ${file.filename}, skipping`);
		}
	}

	return results;
}

export async function getFileTree(
	octokit: Octokit,
	owner: string,
	repo: string,
	headSha: string,
): Promise<string[]> {
	const { data } = await octokit.rest.git.getTree({
		owner,
		repo,
		tree_sha: headSha,
		recursive: "true",
	});

	if (data.truncated) {
		core.warning("File tree was truncated by the GitHub API");
	}

	return data.tree
		.filter((item) => item.path !== undefined)
		.map((item) => item.path as string);
}

export async function getPRCommits(
	octokit: Octokit,
	owner: string,
	repo: string,
	pullNumber: number,
): Promise<CommitInfo[]> {
	const commits = await octokit.paginate(octokit.rest.pulls.listCommits, {
		owner,
		repo,
		pull_number: pullNumber,
	});

	return commits.map((c) => ({
		sha: c.sha,
		message: c.commit.message,
	}));
}
