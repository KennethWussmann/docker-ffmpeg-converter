import { FileSizeTracker } from "./fileSizeTracker";
import EventEmitter from "events";
import { statSync } from "fs";
import { join, parse } from "path";
import { Logger } from "winston";
import { glob } from "zx";

export class FileWatcherService extends EventEmitter {
	public readonly trackedFiles: Map<string, FileSizeTracker> = new Map();
	private readonly scanInterval: number;
	private scanIntervalTimer: NodeJS.Timeout | undefined = undefined;

	constructor(
		private logger: Logger,
		private sourceDirectory: string,
		private patterns: string[],
		private counterpartPatterns: string[] | undefined,
		scanInterval: number,
		private unchangedIntervals: number,
	) {
		super();
		this.scanInterval = scanInterval * 1000; // secs to ms
	}

	start = () => {
		if (this.isRunning()) {
			throw new Error("Watcher task already running");
		}
		this.logger.info("Starting to poll for new files in source directory", {
			sourceDirectory: this.sourceDirectory,
			patterns: this.patterns,
		});
		this.scanIntervalTimer = setInterval(() => {
			void this.scan();
		}, this.scanInterval);
	};

	private isRunning = () => !!this.scanIntervalTimer;

	stop = () => {
		this.logger.info("Stopping file watcher");
		clearInterval(this.scanIntervalTimer);
		this.scanIntervalTimer = undefined;
	};

	onNewFile = (callback: (file: string, counterpart?: string) => void | Promise<void>) => this.on("newFile", callback);

	private scan = async () => {
		const files = await glob(this.patterns, { cwd: this.sourceDirectory });
		const counterpartFiles = this.counterpartPatterns
			? await glob(this.counterpartPatterns, { cwd: this.sourceDirectory })
			: undefined;

		this.logger.debug(`Found ${files.length} file${files.length !== 1 ? "s" : ""}`, {
			sourceDirectory: this.sourceDirectory,
			files,
		});

		files
			.map((file) => join(this.sourceDirectory, file))
			.forEach((file) => {
				const stats = statSync(file);
				const fileSize = stats.size;
				const tracker = this.trackedFiles.get(file);

				const getCounterpart = () => {
					if (!counterpartFiles) return null;

					const { name } = parse(file);
					const counterparts = counterpartFiles.filter((f) => parse(f).name === name);
					return counterparts.length > 0 ? join(this.sourceDirectory, counterparts[0]) : null;
				};

				const counterpart = getCounterpart();

				if (tracker) {
					if (this.counterpartPatterns && !counterpart) {
						// counterpart is required but does not exist
						return;
					}

					if (tracker.consumed) {
						// file was emitted once and is ignored from now on
						return;
					}

					this.logger.debug("File remained unchanged during this scan", { file, tracker });
					tracker.updateSize(fileSize);

					if (!tracker.consumed && tracker.isUnchangedFor(this.unchangedIntervals)) {
						this.logger.debug("Emitting new file event for unchanged file", { file });
						this.logger.info("New unchanged file found", { file });
						tracker.setConsumed();
						this.emit("newFile", file, counterpart || undefined);
					}
				} else {
					this.logger.debug("Caching new file", { file });
					this.trackedFiles.set(file, new FileSizeTracker(file, fileSize));
				}
			});
	};
}
