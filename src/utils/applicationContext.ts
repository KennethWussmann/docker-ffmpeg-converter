import { ConverterService, FFMPEGService } from "../converter";
import { FileWatcherService } from "../watcher/fileWatcherService";
import { Configuration } from "./configuration";
import { createLogger } from "./logger";

export class ApplicationContext {
	private readonly rootLogger = createLogger({});
	public readonly fileWatcherService: FileWatcherService;
	public readonly ffmpegService: FFMPEGService;
	public readonly converterService: ConverterService;

	constructor(private configuration: Configuration = new Configuration()) {
		this.fileWatcherService = new FileWatcherService(
			this.rootLogger.child({ name: "FileWatcherService" }),
			this.configuration.config.SOURCE_DIRECTORY_PATH,
			this.configuration.config.GLOB_PATTERNS,
			this.configuration.config.COUNTERPART_GLOB_PATTERNS,
			this.configuration.config.SCAN_INTERVAL,
			this.configuration.config.FILE_UNCHANGED_INTERVALS,
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
		);
	}
}
