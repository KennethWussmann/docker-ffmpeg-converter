import { rm } from "node:fs/promises";
import type { FFMPEGService, FileWatcherService, Logger } from "../";

export class ConverterService {
  private readonly abortController = new AbortController();

  constructor(
    private logger: Logger,
    private fileWatcherService: FileWatcherService,
    private ffmpegService: FFMPEGService,
    private removeDelay: number,
    private removeSourceFileAfterConvert: boolean,
    private version: string,
  ) {
    this.fileWatcherService.onNewFile(this.onNewFile);
  }

  start = async () => {
    this.logger.info("Starting converter service", { version: this.version });
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

  private onNewFile = async (file: string) => {
    this.logger.info("Converting new file", { file });
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
    }
  };
}
