import { rm } from "node:fs/promises";
import type { Logger } from "winston";
import type { FileLock, FileWatcherService } from "../watcher";
import type { FFMPEGService } from "./ffmpegService";

type QueuedFile = {
  file: string;
  lock: FileLock;
};

export class ConverterService {
  private readonly abortController = new AbortController();
  private readonly queue: QueuedFile[] = [];
  private activeCount = 0;

  constructor(
    private logger: Logger,
    private fileWatcherService: FileWatcherService,
    private ffmpegService: FFMPEGService,
    private removeDelay: number,
    private removeSourceFileAfterConvert: boolean,
    private version: string,
    private concurrency: number,
  ) {
    this.fileWatcherService.onNewFile(this.onNewFile);
  }

  start = async () => {
    this.logger.info("Starting converter service", {
      version: this.version,
      concurrency: this.concurrency,
    });
    const ffmpegVersion = await this.ffmpegService.getVersion();
    this.logger.info("This software uses libraries from the FFmpeg project under the LGPLv2.1", {
      ffmpegVersion,
    });
    await this.fileWatcherService.start();
  };

  stop = () => {
    this.fileWatcherService.stop();
    this.logger.info("Aborting running ffmpeg processes");
    this.abortController.abort();
    this.logger.info("Stopping converter service");
  };

  private removeSourceFile = async (file: string) => {
    this.logger.info("Removing source file", { file });
    await rm(file);
  };

  private onNewFile = (lock: FileLock) => {
    this.queue.push({ file: lock.sourceFile, lock });
    this.logger.info("Queued file for conversion", {
      file: lock.sourceFile,
      queueLength: this.queue.length,
      activeCount: this.activeCount,
    });
    this.processQueue();
  };

  private processQueue = () => {
    while (this.activeCount < this.concurrency && this.queue.length > 0) {
      const queuedFile = this.queue.shift();
      if (!queuedFile) break;
      this.activeCount++;
      this.logger.info("Converting file", {
        file: queuedFile.file,
        activeCount: this.activeCount,
        remaining: this.queue.length,
      });
      void this.convertFile(queuedFile);
    }
  };

  private convertFile = async ({ file, lock }: QueuedFile) => {
    let completed = false;

    try {
      await this.ffmpegService.exec(this.abortController.signal, file);
      this.logger.info("Successfully converted file", { file });

      if (!this.removeSourceFileAfterConvert) {
        this.logger.debug("Not removing source file because setting is disabled");
        completed = true;
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, this.removeDelay * 1000));
      await this.removeSourceFile(file);
      completed = true;
    } catch (error) {
      this.logger.error("Failed to convert file", { file, error });
    } finally {
      try {
        await lock.release({ completed: completed && !this.removeSourceFileAfterConvert });
      } catch (error) {
        this.logger.error("Failed to release lock", { file, error });
      }
      this.activeCount--;
      void this.processQueue();
    }
  };
}
