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
	};
}

type MockOctokit = ReturnType<typeof createMockOctokit>;

function asOctokit(mock: MockOctokit): Octokit {
	return mock as unknown as Octokit;
}

describe("postOrUpdateComment", () => {
	it("creates a new comment when no existing comment found", async () => {
		const mock = createMockOctokit();
		mock.paginate.mockResolvedValue([]);
		mock.rest.issues.createComment.mockResolvedValue({});

		await postOrUpdateComment(
			asOctokit(mock),
			"owner",
			"repo",
			1,
			"Test instructions",
		);

		expect(mock.rest.issues.createComment).toHaveBeenCalledWith({
			owner: "owner",
			repo: "repo",
			issue_number: 1,
			body: expect.stringContaining("Test instructions"),
		});
		expect(mock.rest.issues.updateComment).not.toHaveBeenCalled();
	});

	it("updates existing comment when marker is found", async () => {
		const mock = createMockOctokit();
		mock.paginate.mockResolvedValue([
			{ id: 42, body: `${COMMENT_MARKER}\nOld instructions` },
		]);
		mock.rest.issues.updateComment.mockResolvedValue({});

		await postOrUpdateComment(
			asOctokit(mock),
			"owner",
			"repo",
			1,
			"New instructions",
		);

		expect(mock.rest.issues.updateComment).toHaveBeenCalledWith({
			owner: "owner",
			repo: "repo",
			comment_id: 42,
			body: expect.stringContaining("New instructions"),
		});
		expect(mock.rest.issues.createComment).not.toHaveBeenCalled();
	});

	it("comment body includes marker and header", async () => {
		const mock = createMockOctokit();
		mock.paginate.mockResolvedValue([]);
		mock.rest.issues.createComment.mockResolvedValue({});

		await postOrUpdateComment(
			asOctokit(mock),
			"owner",
			"repo",
			1,
			"Instructions here",
		);

		const body = mock.rest.issues.createComment.mock.calls[0][0].body as string;
		expect(body).toContain(COMMENT_MARKER);
		expect(body).toContain("## QA Instructions");
		expect(body).toContain("Instructions here");
		expect(body).toContain("QA Instructions Action");
	});
});
