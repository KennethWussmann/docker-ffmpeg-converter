import { config } from "dotenv";
config();

import { z } from "zod";

const environmentVariables = z.object({
	VERSION: z.string().default("develop"),
	GLOB_PATTERNS: z.string().transform((s) => s.split(",")),
	SCAN_INTERVAL: z
		.string()
		.transform((s) => parseInt(s, 10))
		.default("10"),
	FILE_UNCHANGED_INTERVALS: z
		.string()
		.transform((s) => parseInt(s, 10))
		.default("3"),
	SOURCE_DIRECTORY_PATH: z.string(),
	DESTINATION_DIRECTORY_PATH: z.string(),
	REMOVE_SOURCE_AFTER_CONVERT: z
		.string()
		.transform((s) => s.toLowerCase() === "true")
		.default("false"),
	FFMPEG_PATH: z.string(),
	FFMPEG_ARGS: z.string(),
});

type EnvironmentConfiguration = z.infer<typeof environmentVariables>;

export class Configuration {
	constructor(public config: EnvironmentConfiguration = environmentVariables.parse(process.env)) {}
}
