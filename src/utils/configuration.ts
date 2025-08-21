import { config } from "dotenv";

config({ quiet: true });

import { z } from "zod";

const environmentVariables = z.object({
  VERSION: z.string().default("develop"),

  LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "fatal"]).default("info"),
  LOG_FORMAT: z.enum(["json", "text"]).default("json"),
  LOG_DESTINATION: z.string().optional(),

  GLOB_PATTERNS: z.string().transform((s) => s.split(",")),
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
export type LogLevel = EnvironmentConfiguration["LOG_LEVEL"];
export type LogFormat = EnvironmentConfiguration["LOG_FORMAT"];

export class Configuration {
  constructor(public config: EnvironmentConfiguration = environmentVariables.parse(process.env)) {}
}
