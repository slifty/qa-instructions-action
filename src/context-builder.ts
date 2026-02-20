import type { PrData } from "./types.js";
import {
	MAX_DIFF_CHARS,
	MAX_CHANGED_FILES_CHARS,
	MAX_FILE_CHARS,
	MAX_FILE_TREE_CHARS,
	MAX_TOTAL_CHARS,
} from "./constants.js";

function truncateAtLineBreak(text: string, maxChars: number): string {
	if (text.length <= maxChars) return text;
	const truncated = text.slice(0, maxChars);
	const lastNewline = truncated.lastIndexOf("\n");
	const cutPoint = lastNewline > 0 ? lastNewline : maxChars;
	return truncated.slice(0, cutPoint) + "\n\n[Content truncated]";
}

export function buildPromptContext(data: PrData, customPrompt: string): string {
	const sections: string[] = [];

	// Pr title + description + commits (always included in full)
	sections.push(`## Pull Request\n\n**Title:** ${data.metadata.title}`);
	if (data.metadata.body) {
		sections.push(`**Description:**\n${data.metadata.body}`);
	}

	if (data.commits.length > 0) {
		const commitLines = data.commits
			.map((c) => `- ${c.sha.slice(0, 7)} ${c.message}`)
			.join("\n");
		sections.push(`## Commits\n\n${commitLines}`);
	}

	// Diff (up to MAX_DIFF_CHARS)
	if (data.diff) {
		const truncatedDiff = truncateAtLineBreak(data.diff, MAX_DIFF_CHARS);
		sections.push(`## Diff\n\n\`\`\`diff\n${truncatedDiff}\n\`\`\``);
	}

	// Changed file contents (up to MAX_CHANGED_FILES_CHARS total, MAX_FILE_CHARS per file)
	// Sort by content length descending (most-changed files first)
	if (data.changedFiles.length > 0) {
		const sorted = [...data.changedFiles].sort(
			(a, b) => b.content.length - a.content.length,
		);
		const fileBlocks: string[] = [];
		let totalFileChars = 0;

		for (const file of sorted) {
			if (totalFileChars >= MAX_CHANGED_FILES_CHARS) break;

			const remaining = MAX_CHANGED_FILES_CHARS - totalFileChars;
			const perFileLimit = Math.min(MAX_FILE_CHARS, remaining);
			const content = truncateAtLineBreak(file.content, perFileLimit);

			fileBlocks.push(`### ${file.filename}\n\n\`\`\`\n${content}\n\`\`\``);
			totalFileChars += content.length;
		}

		sections.push(`## Changed File Contents\n\n${fileBlocks.join("\n\n")}`);
	}

	// File tree (lowest priority, up to MAX_FILE_TREE_CHARS)
	if (data.fileTree.length > 0) {
		const treeText = data.fileTree.join("\n");
		const truncatedTree = truncateAtLineBreak(treeText, MAX_FILE_TREE_CHARS);
		sections.push(
			`## Repository File Tree\n\n\`\`\`\n${truncatedTree}\n\`\`\``,
		);
	}

	// Custom prompt
	if (customPrompt) {
		sections.push(`## Additional Instructions\n\n${customPrompt}`);
	}

	let result = sections.join("\n\n");

	// Overall cap
	if (result.length > MAX_TOTAL_CHARS) {
		result = truncateAtLineBreak(result, MAX_TOTAL_CHARS);
	}

	return result;
}
