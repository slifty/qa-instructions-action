import { describe, it, expect, vi, beforeEach } from "vitest";
import * as core from "@actions/core";
import type { Octokit } from "./types.js";
import {
	getPRMetadata,
	getPRDiff,
	getChangedFiles,
	getFileTree,
	getPRCommits,
} from "./github.js";

vi.mock("@actions/core");

function createMockOctokit() {
	return {
		rest: {
			pulls: {
				get: vi.fn(),
				listFiles: vi.fn(),
				listCommits: vi.fn(),
			},
			repos: {
				getContent: vi.fn(),
			},
			git: {
				getTree: vi.fn(),
			},
		},
		paginate: vi.fn(),
	} as unknown as Octokit;
}

describe("getPRMetadata", () => {
	it("returns title, body, and headSha", async () => {
		const octokit = createMockOctokit();
		octokit.rest.pulls.get.mockResolvedValue({
			data: {
				title: "My PR",
				body: "Description",
				head: { sha: "abc123" },
			},
		});

		const result = await getPRMetadata(octokit, "owner", "repo", 1);

		expect(result).toEqual({
			title: "My PR",
			body: "Description",
			headSha: "abc123",
		});
		expect(octokit.rest.pulls.get).toHaveBeenCalledWith({
			owner: "owner",
			repo: "repo",
			pull_number: 1,
		});
	});

	it("returns empty string for null body", async () => {
		const octokit = createMockOctokit();
		octokit.rest.pulls.get.mockResolvedValue({
			data: {
				title: "My PR",
				body: null,
				head: { sha: "abc123" },
			},
		});

		const result = await getPRMetadata(octokit, "owner", "repo", 1);
		expect(result.body).toBe("");
	});
});

describe("getPRDiff", () => {
	it("returns diff string with diff media format", async () => {
		const octokit = createMockOctokit();
		octokit.rest.pulls.get.mockResolvedValue({
			data: "+added\n-removed",
		});

		const result = await getPRDiff(octokit, "owner", "repo", 1);

		expect(result).toBe("+added\n-removed");
		expect(octokit.rest.pulls.get).toHaveBeenCalledWith({
			owner: "owner",
			repo: "repo",
			pull_number: 1,
			mediaType: { format: "diff" },
		});
	});
});

describe("getChangedFiles", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("fetches content for non-removed files", async () => {
		const octokit = createMockOctokit();
		octokit.paginate.mockResolvedValue([
			{ filename: "src/index.ts", status: "modified", sha: "file-sha-1" },
			{ filename: "old.ts", status: "removed", sha: "file-sha-2" },
		]);
		octokit.rest.repos.getContent.mockResolvedValue({
			data: {
				content: Buffer.from("console.log('hello')").toString("base64"),
			},
		});

		const result = await getChangedFiles(octokit, "owner", "repo", 1);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({
			filename: "src/index.ts",
			content: "console.log('hello')",
		});
	});

	it("skips files that fail to fetch with a warning", async () => {
		const octokit = createMockOctokit();
		octokit.paginate.mockResolvedValue([
			{ filename: "binary.png", status: "added", sha: "file-sha" },
		]);
		octokit.rest.repos.getContent.mockRejectedValue(new Error("Not found"));

		const result = await getChangedFiles(octokit, "owner", "repo", 1);

		expect(result).toHaveLength(0);
		expect(core.warning).toHaveBeenCalledWith(
			"Could not fetch content for binary.png, skipping",
		);
	});
});

describe("getFileTree", () => {
	it("returns file paths from git tree", async () => {
		const octokit = createMockOctokit();
		octokit.rest.git.getTree.mockResolvedValue({
			data: {
				truncated: false,
				tree: [
					{ path: "src/index.ts" },
					{ path: "package.json" },
					{ path: undefined },
				],
			},
		});

		const result = await getFileTree(octokit, "owner", "repo", "sha123");

		expect(result).toEqual(["src/index.ts", "package.json"]);
		expect(octokit.rest.git.getTree).toHaveBeenCalledWith({
			owner: "owner",
			repo: "repo",
			tree_sha: "sha123",
			recursive: "true",
		});
	});

	it("warns when tree is truncated", async () => {
		const octokit = createMockOctokit();
		octokit.rest.git.getTree.mockResolvedValue({
			data: {
				truncated: true,
				tree: [{ path: "src/index.ts" }],
			},
		});

		await getFileTree(octokit, "owner", "repo", "sha123");

		expect(core.warning).toHaveBeenCalledWith(
			"File tree was truncated by the GitHub API",
		);
	});
});

describe("getPRCommits", () => {
	it("returns sha and message for each commit", async () => {
		const octokit = createMockOctokit();
		octokit.paginate.mockResolvedValue([
			{ sha: "abc123", commit: { message: "Initial commit" } },
			{ sha: "def456", commit: { message: "Fix bug" } },
		]);

		const result = await getPRCommits(octokit, "owner", "repo", 1);

		expect(result).toEqual([
			{ sha: "abc123", message: "Initial commit" },
			{ sha: "def456", message: "Fix bug" },
		]);
	});
});
