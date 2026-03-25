import { rm } from "node:fs/promises";
import type { FFMPEGService, FileWatcherService, Logger } from "../";

export class ConverterService {
  private readonly abortController = new AbortController();
  private readonly queue: string[] = [];
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
    this.fileWatcherService.start();
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

  private onNewFile = (file: string) => {
    this.queue.push(file);
    this.logger.info("Queued file for conversion", {
      file,
      queueLength: this.queue.length,
      activeCount: this.activeCount,
    });
    this.processQueue();
  };

  private processQueue = () => {
    while (this.activeCount < this.concurrency && this.queue.length > 0) {
      const file = this.queue.shift();
      if (!file) break;
      this.activeCount++;
      this.logger.info("Converting file", {
        file,
        activeCount: this.activeCount,
        remaining: this.queue.length,
      });
      void this.convertFile(file);
    }
  };

  private convertFile = async (file: string) => {
    try {
      await this.ffmpegService.exec(this.abortController.signal, file);
      this.logger.info("Successfully converted file", { file });

      if (!this.removeSourceFileAfterConvert) {
        this.logger.debug("Not removing source file because setting is disabled");
        return;
      }

      setTimeout(async () => {
        await this.removeSourceFile(file);
      }, this.removeDelay * 1000);
    } catch (error) {
      this.logger.error("Failed to convert file", { file, error });
    } finally {
      this.activeCount--;
      void this.processQueue();
    }
  };
}
