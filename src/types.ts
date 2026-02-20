import * as github from "@actions/github";

export type Octokit = ReturnType<typeof github.getOctokit>;

export interface PRMetadata {
	title: string;
	body: string;
	headSha: string;
}

export interface FileContent {
	filename: string;
	content: string;
}

export interface CommitInfo {
	sha: string;
	message: string;
}

export interface PRData {
	metadata: PRMetadata;
	diff: string;
	changedFiles: FileContent[];
	fileTree: string[];
	commits: CommitInfo[];
}
