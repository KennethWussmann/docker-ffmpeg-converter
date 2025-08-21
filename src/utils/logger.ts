import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import type { LogFormat, LogLevel } from "./configuration";

const { createLogger: createWinstonLogger, format } = winston;

export { Logger } from "winston";

type LogConfig = {
  level: LogLevel;
  format: LogFormat;
  destination?: string;
};

type LoggerProperties = {
  config: LogConfig;
  meta?: Record<string, unknown>;
};

const textLine = () =>
  format.printf((info) => {
    const { timestamp, level, message, name, metadata } = info as {
      timestamp: string;
      level: string;
      message: string;
      name?: string;
      metadata: Record<string, unknown>;
    };
    const hasMeta = Object.keys(metadata).length > 0;
    return `[${timestamp}] ${name ?? ""} ${level}: ${message}${hasMeta ? ` | ${JSON.stringify(metadata)}` : ""}`;
  });

const reorder = format((info) => {
  const { timestamp, level, message, name, ...rest } = info;
  return {
    timestamp,
    level,
    name,
    message,
    ...rest,
  };
});

const logFormat: Record<LogFormat, winston.Logform.Format> = {
  json: format.combine(format.timestamp(), reorder(), format.json({ deterministic: false })),
  text: format.combine(
    format.colorize({ all: true }),
    format.timestamp(),
    format.align(),
    format.metadata({ fillExcept: ["timestamp", "level", "message", "name"] }),
    textLine(),
  ),
};

export const createLogger = ({ config, meta }: LoggerProperties) =>
  createWinstonLogger({
    level: config.level,
    format: logFormat[config.format],
    defaultMeta: meta,
    transports: [
      new winston.transports.Console(),
      config.destination
        ? new DailyRotateFile({
            filename: "%DATE%.log",
            dirname: config.destination,
            utc: true,
            zippedArchive: true,
          })
        : undefined,
    ].filter((t): t is InstanceType<typeof winston.transports.Console> | DailyRotateFile => !!t),
  });
