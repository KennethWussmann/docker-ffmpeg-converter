import { config } from "dotenv";
config();

import { z } from "zod";

const environmentVariables = z.object({
	VERSION: z.string().default("develop"),
	GLOB_PATTERNS: z.string().transform((s) => s.split(",")),
	COUNTERPART_GLOB_PATTERNS: z
		.string()
		.transform((s) => s.split(","))
		.optional(),
	SCAN_INTERVAL: z
		.string()
		.transform((s) => parseInt(s, 10))
		.default(10),
	FILE_UNCHANGED_INTERVALS: z
		.string()
		.transform((s) => parseInt(s, 10))
		.default(3),
	SOURCE_DIRECTORY_PATH: z.string(),
	DESTINATION_DIRECTORY_PATH: z.string(),
	REMOVE_SOURCE_AFTER_CONVERT_DELAY: z
		.string()
		.transform((s) => parseInt(s, 10))
		.default(0),
	REMOVE_SOURCE_AFTER_CONVERT: z.stringbool().default(false),
	FFMPEG_PATH: z.string(),
	FFMPEG_ARGS: z.string(),
});

type EnvironmentConfiguration = z.infer<typeof environmentVariables>;

export class Configuration {
	constructor(public config: EnvironmentConfiguration = environmentVariables.parse(process.env)) {}
}
