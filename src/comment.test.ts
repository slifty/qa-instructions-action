import { describe, it, expect, vi } from "vitest";
import type { Octokit } from "./types.js";
import { postOrUpdateComment } from "./comment.js";
import { COMMENT_MARKER } from "./constants.js";

function createMockOctokit() {
	return {
		rest: {
			issues: {
				listComments: vi.fn(),
				createComment: vi.fn(),
				updateComment: vi.fn(),
			},
		},
		paginate: vi.fn(),
	} as unknown as Octokit;
}

describe("postOrUpdateComment", () => {
	it("creates a new comment when no existing comment found", async () => {
		const octokit = createMockOctokit();
		octokit.paginate.mockResolvedValue([]);
		octokit.rest.issues.createComment.mockResolvedValue({});

		await postOrUpdateComment(octokit, "owner", "repo", 1, "Test instructions");

		expect(octokit.rest.issues.createComment).toHaveBeenCalledWith({
			owner: "owner",
			repo: "repo",
			issue_number: 1,
			body: expect.stringContaining("Test instructions"),
		});
		expect(octokit.rest.issues.updateComment).not.toHaveBeenCalled();
	});

	it("updates existing comment when marker is found", async () => {
		const octokit = createMockOctokit();
		octokit.paginate.mockResolvedValue([
			{ id: 42, body: `${COMMENT_MARKER}\nOld instructions` },
		]);
		octokit.rest.issues.updateComment.mockResolvedValue({});

		await postOrUpdateComment(octokit, "owner", "repo", 1, "New instructions");

		expect(octokit.rest.issues.updateComment).toHaveBeenCalledWith({
			owner: "owner",
			repo: "repo",
			comment_id: 42,
			body: expect.stringContaining("New instructions"),
		});
		expect(octokit.rest.issues.createComment).not.toHaveBeenCalled();
	});

	it("comment body includes marker and header", async () => {
		const octokit = createMockOctokit();
		octokit.paginate.mockResolvedValue([]);
		octokit.rest.issues.createComment.mockResolvedValue({});

		await postOrUpdateComment(octokit, "owner", "repo", 1, "Instructions here");

		const body = octokit.rest.issues.createComment.mock.calls[0][0]
			.body as string;
		expect(body).toContain(COMMENT_MARKER);
		expect(body).toContain("## QA Instructions");
		expect(body).toContain("Instructions here");
		expect(body).toContain("QA Instructions Action");
	});
});
