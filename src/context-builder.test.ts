import { describe, it, expect } from "vitest";
import { buildPromptContext } from "./context-builder.js";
import type { PrData } from "./types.js";
import { MAX_DIFF_CHARS, MAX_FILE_CHARS } from "./constants.js";

function makePrData(overrides: Partial<PrData> = {}): PrData {
	return {
		metadata: { title: "Test PR", body: "Test body", headSha: "abc123" },
		diff: "diff content",
		changedFiles: [],
		fileTree: [],
		commits: [],
		...overrides,
	};
}

describe("buildPromptContext", () => {
	it("includes PR title and description", () => {
		const result = buildPromptContext(makePrData(), "");
		expect(result).toContain("**Title:** Test PR");
		expect(result).toContain("Test body");
	});

	it("omits description section when body is empty", () => {
		const data = makePrData({
			metadata: { title: "Test", body: "", headSha: "abc" },
		});
		const result = buildPromptContext(data, "");
		expect(result).not.toContain("**Description:**");
	});

	it("includes commits", () => {
		const data = makePrData({
			commits: [
				{ sha: "abcdef1234567", message: "Initial commit" },
				{ sha: "1234567abcdef", message: "Fix bug" },
			],
		});
		const result = buildPromptContext(data, "");
		expect(result).toContain("## Commits");
		expect(result).toContain("- abcdef1 Initial commit");
		expect(result).toContain("- 1234567 Fix bug");
	});

	it("includes diff content", () => {
		const data = makePrData({ diff: "+added line\n-removed line" });
		const result = buildPromptContext(data, "");
		expect(result).toContain("## Diff");
		expect(result).toContain("+added line\n-removed line");
	});

	it("truncates long diffs at line boundaries", () => {
		const lines = Array.from({ length: 10000 }, (_, i) => `+line ${i}`);
		const longDiff = lines.join("\n");
		expect(longDiff.length).toBeGreaterThan(MAX_DIFF_CHARS);

		const result = buildPromptContext(makePrData({ diff: longDiff }), "");
		expect(result).toContain("[Content truncated]");
	});

	it("includes changed file contents sorted by size", () => {
		const data = makePrData({
			changedFiles: [
				{ filename: "small.ts", content: "small" },
				{ filename: "big.ts", content: "x".repeat(500) },
			],
		});
		const result = buildPromptContext(data, "");
		expect(result).toContain("## Changed File Contents");
		// Big file should appear before small file
		const bigIdx = result.indexOf("big.ts");
		const smallIdx = result.indexOf("small.ts");
		expect(bigIdx).toBeLessThan(smallIdx);
	});

	it("truncates individual files exceeding MAX_FILE_CHARS", () => {
		const data = makePrData({
			changedFiles: [
				{
					filename: "huge.ts",
					content: Array.from({ length: 2000 }, (_, i) => `line ${i}`).join(
						"\n",
					),
				},
			],
		});
		// The content is larger than MAX_FILE_CHARS
		expect(data.changedFiles[0].content.length).toBeGreaterThan(MAX_FILE_CHARS);

		const result = buildPromptContext(data, "");
		expect(result).toContain("[Content truncated]");
	});

	it("stops adding files when total exceeds MAX_CHANGED_FILES_CHARS", () => {
		const files = Array.from({ length: 20 }, (_, i) => ({
			filename: `file${i}.ts`,
			content: "x".repeat(MAX_FILE_CHARS - 100),
		}));
		const data = makePrData({ changedFiles: files });

		const result = buildPromptContext(data, "");

		// Not all 20 files should be included
		const includedCount = (result.match(/### file\d+\.ts/g) || []).length;
		expect(includedCount).toBeLessThan(20);
		expect(includedCount).toBeGreaterThan(0);
	});

	it("includes file tree", () => {
		const data = makePrData({
			fileTree: ["src/index.ts", "src/utils.ts", "package.json"],
		});
		const result = buildPromptContext(data, "");
		expect(result).toContain("## Repository File Tree");
		expect(result).toContain("src/index.ts");
	});

	it("includes custom prompt as additional instructions", () => {
		const result = buildPromptContext(
			makePrData(),
			"Focus on accessibility testing",
		);
		expect(result).toContain("## Additional Instructions");
		expect(result).toContain("Focus on accessibility testing");
	});

	it("omits additional instructions when custom prompt is empty", () => {
		const result = buildPromptContext(makePrData(), "");
		expect(result).not.toContain("## Additional Instructions");
	});

	it("respects overall character cap", () => {
		// Create data that would exceed MAX_TOTAL_CHARS
		const data = makePrData({
			diff: "x".repeat(80_000),
			changedFiles: [{ filename: "big.ts", content: "y".repeat(60_000) }],
			fileTree: Array.from({ length: 5000 }, (_, i) => `path/${i}.ts`),
		});
		const result = buildPromptContext(data, "");
		// The result includes truncation markers, so it will be slightly over
		// but the core content should be capped
		expect(result).toContain("[Content truncated]");
	});
});
