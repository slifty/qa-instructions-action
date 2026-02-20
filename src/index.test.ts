import { describe, it, expect, vi, beforeEach } from "vitest";
import * as core from "@actions/core";
import { run } from "./index.js";

vi.mock("@actions/core");

describe("run", () => {
	beforeEach(() => {
		vi.resetAllMocks();
	});

	it("reads github-token input and sets instructions output", async () => {
		vi.mocked(core.getInput).mockReturnValue("fake-token");

		await run();

		expect(core.getInput).toHaveBeenCalledWith("github-token", {
			required: true,
		});
		expect(core.setOutput).toHaveBeenCalledWith(
			"instructions",
			"Hello from QA Instructions Action!",
		);
	});

	it("calls setFailed when getInput throws", async () => {
		vi.mocked(core.getInput).mockImplementation(() => {
			throw new Error("Input required and not supplied: github-token");
		});

		await run();

		expect(core.setFailed).toHaveBeenCalledWith(
			"Input required and not supplied: github-token",
		);
	});
});
