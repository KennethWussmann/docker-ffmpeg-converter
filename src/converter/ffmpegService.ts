import { execa } from "execa";
import { join, parse, resolve } from "path";
import { Logger } from "winston";

export class FFMPEGService {
	constructor(
		private logger: Logger,
		private ffmpegPath: string,
		private ffmpegArgs: string,
		private destinationDirectory: string,
	) {}

	private renderArgs = (args: string, ...params: string[]) => {
		let i = 0;
		return args.replace(/%s/g, () => params[i++]);
	};

	private splitArgs = (args: string) => args.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

	getVersion = async (): Promise<string> => {
		try {
			const result = await execa(this.ffmpegPath, ["-version"]);
			const firstLine = result.stdout.split("\n")[0];
			const versionMatch = firstLine.match(/ffmpeg version ([^\s]+)/);
			return versionMatch ? versionMatch[1] : "unknown";
		} catch (error) {
			this.logger.error("Failed to get FFmpeg version", { error });
			return "unknown";
		}
	};

	exec = async (abortSignal: AbortSignal, sourceFilePath: string): Promise<void> => {
		return new Promise((resolvePromise, reject) => {
			const { name } = parse(sourceFilePath);
			const args = this.splitArgs(
				this.renderArgs(this.ffmpegArgs, resolve(sourceFilePath), join(resolve(this.destinationDirectory), name)),
			);
			this.logger.debug("Launching ffmpeg process", { bin: this.ffmpegPath, args, sourceFilePath });
			const subProcess = execa(this.ffmpegPath, args, { signal: abortSignal });
			const subProcessLogger = this.logger.child({ name: "FFMPEGService#subprocess" });

			subProcess.on("close", (code, signal) => {
				if (code && code > 0) {
					this.logger.error("FFMPEG process exited with error", { code, signal });
					reject();
				} else {
					this.logger.debug("FFMPEG process exited gracefully", { code, signal });
					resolvePromise();
				}
			});

			subProcess.on("error", (error) => {
				this.logger.error("Error occoured while executing ffmpeg", { error });
			});

			subProcess.stdout?.on("data", (chunk) => {
				const message = Buffer.from(chunk).toString();
				subProcessLogger.debug(message);
			});

			subProcess.stderr?.on("data", (chunk) => {
				const message = Buffer.from(chunk).toString();
				subProcessLogger.error(message);
			});
		});
	};
}
