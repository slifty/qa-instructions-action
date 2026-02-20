import * as core from "@actions/core";

export async function run(): Promise<void> {
	try {
		core.info("QA Instructions Action is running!");

		const token = core.getInput("github-token", { required: true });
		core.debug(`Token length: ${token.length}`);

		const instructions = "Hello from QA Instructions Action!";
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
