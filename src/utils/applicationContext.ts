import { ConverterService, FFMPEGService, FileLockService } from "../converter";
import { FileWatcherService } from "../watcher/fileWatcherService";
import { Configuration } from "./configuration";
import { createLogger, type Logger } from "./logger";

export class ApplicationContext {
  private readonly rootLogger: Logger;
  public readonly fileWatcherService: FileWatcherService;
  public readonly ffmpegService: FFMPEGService;
  public readonly fileLockService: FileLockService;
  public readonly converterService: ConverterService;

  constructor(private configuration: Configuration = new Configuration()) {
    this.rootLogger = createLogger({
      config: {
        level: this.configuration.config.LOG_LEVEL,
        format: this.configuration.config.LOG_FORMAT,
        destination: this.configuration.config.LOG_DESTINATION,
      },
    });
    this.fileLockService = new FileLockService(
      this.rootLogger.child({ name: "FileLockService" }),
      this.configuration.config.SERVER_NAME,
      this.configuration.config.LOCK_ENABLED,
      this.configuration.config.LOCK_DIRECTORY_PATH,
      this.configuration.config.LOCK_STALE_AFTER_SECONDS,
    );
    this.fileWatcherService = new FileWatcherService(
      this.rootLogger.child({ name: "FileWatcherService" }),
      this.configuration.config.SOURCE_DIRECTORY_PATH,
      this.configuration.config.GLOB_PATTERNS,
      this.configuration.config.SCAN_INTERVAL,
      this.configuration.config.FILE_UNCHANGED_INTERVALS,
      this.fileLockService,
    );
    this.ffmpegService = new FFMPEGService(
      this.rootLogger.child({ name: "FFMPEGService" }),
      this.configuration.config.FFMPEG_PATH,
      this.configuration.config.FFMPEG_ARGS,
      this.configuration.config.DESTINATION_DIRECTORY_PATH,
    );
    this.converterService = new ConverterService(
      this.rootLogger.child({ name: "ConverterService" }),
      this.fileWatcherService,
      this.ffmpegService,
      this.configuration.config.REMOVE_SOURCE_AFTER_CONVERT_DELAY,
      this.configuration.config.REMOVE_SOURCE_AFTER_CONVERT,
      this.configuration.config.VERSION,
      this.configuration.config.CONCURRENCY,
    );
  }
}
