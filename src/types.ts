import * as github from "@actions/github";

export type Octokit = ReturnType<typeof github.getOctokit>;

export interface PrMetadata {
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

export interface PrData {
	metadata: PrMetadata;
	diff: string;
	changedFiles: FileContent[];
	fileTree: string[];
	commits: CommitInfo[];
}
