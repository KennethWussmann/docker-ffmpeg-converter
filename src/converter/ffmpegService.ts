import { arch, platform } from "node:os";
import { join, parse, resolve } from "node:path";
import { execa } from "execa";
import type { Logger } from "winston";

export class FFMPEGService {
  constructor(
    private logger: Logger,
    private ffmpegPath: string,
    private ffmpegArgs: string,
    private destinationDirectory: string,
  ) {}

  private splitArgs = (args: string) => args.match(/(?:[^\s"]+|"[^"]*")+/g) || [];

  private renderAndSplitArgs = (args: string, ...params: string[]) => {
    let i = 0;
    return this.splitArgs(args).map((a) => a.replace(/%s/g, () => params[i++]));
  };

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

  private getSystemInfo = () => {
    return {
      platform: platform(),
      architecture: arch(),
      containerized:
        process.env.DOCKER_CONTAINER === "true" || !!process.env.KUBERNETES_SERVICE_HOST,
    };
  };

  private getGPUInfo = async () => {
    const gpuInfo = {
      nvidia: false,
      amd: false,
      intel: false,
      details: [] as string[],
    };

    // Check for NVIDIA GPU support
    try {
      const nvidiaResult = await execa(
        "nvidia-smi",
        ["--query-gpu=name,driver_version", "--format=csv,noheader"],
        { timeout: 5000 },
      );
      if (nvidiaResult.stdout.trim()) {
        gpuInfo.nvidia = true;
        gpuInfo.details.push(`NVIDIA: ${nvidiaResult.stdout.trim()}`);
      }
    } catch {
      // nvidia-smi not available or no NVIDIA GPU
    }

    // Check for AMD GPU (basic check)
    try {
      if (platform() === "linux") {
        const result = await execa("lspci", ["-nn"], { timeout: 5000 });
        const amdGpuMatch = result.stdout.match(/Advanced Micro Devices.*\[AMD\/ATI\]/i);
        if (amdGpuMatch) {
          gpuInfo.amd = true;
          gpuInfo.details.push("AMD GPU detected via lspci");
        }
      }
    } catch {
      // lspci not available
    }

    // Check for Intel integrated graphics
    try {
      if (platform() === "linux") {
        const result = await execa("lspci", ["-nn"], { timeout: 5000 });
        const intelGpuMatch = result.stdout.match(/Intel.*Graphics/i);
        if (intelGpuMatch) {
          gpuInfo.intel = true;
          gpuInfo.details.push("Intel GPU detected via lspci");
        }
      }
    } catch {
      // lspci not available
    }

    return gpuInfo;
  };

  private getFFmpegCapabilities = async () => {
    const capabilities = {
      encoders: [] as string[],
      hwaccels: [] as string[],
      hasNvidiaSupport: false,
      hasVAAPISupport: false,
      hasQSVSupport: false,
    };

    try {
      // Get hardware acceleration methods
      const hwaccelResult = await execa(this.ffmpegPath, ["-hwaccels"], { timeout: 10000 });
      capabilities.hwaccels = hwaccelResult.stdout
        .split("\n")
        .slice(1) // Skip header
        .filter((line) => line.trim())
        .map((line) => line.trim());

      capabilities.hasNvidiaSupport = capabilities.hwaccels.some(
        (hwaccel) =>
          hwaccel.includes("cuda") || hwaccel.includes("nvenc") || hwaccel.includes("nvdec"),
      );
      capabilities.hasVAAPISupport = capabilities.hwaccels.includes("vaapi");
      capabilities.hasQSVSupport = capabilities.hwaccels.includes("qsv");

      // Get available encoders (focus on hardware ones)
      const encodersResult = await execa(this.ffmpegPath, ["-encoders"], { timeout: 10000 });
      const hwEncoders = encodersResult.stdout
        .split("\n")
        .filter((line) => line.includes("h264") || line.includes("h265") || line.includes("hevc"))
        .filter(
          (line) =>
            line.includes("nvenc") ||
            line.includes("vaapi") ||
            line.includes("qsv") ||
            line.includes("videotoolbox"),
        )
        .map((line) => {
          const match = line.match(/\s+(\w+)\s+/);
          return match ? match[1] : "";
        })
        .filter((encoder) => encoder);

      capabilities.encoders = hwEncoders;
    } catch (error) {
      this.logger.debug("Error getting FFmpeg capabilities", { error });
    }

    return capabilities;
  };

  logSystemInfo = async () => {
    const systemInfo = this.getSystemInfo();
    const gpuInfo = await this.getGPUInfo();
    const capabilities = await this.getFFmpegCapabilities();

    // Log important info at info level
    this.logger.info("System information", {
      platform: systemInfo.platform,
      architecture: systemInfo.architecture,
      containerized: systemInfo.containerized,
      gpuSupport: {
        nvidia: gpuInfo.nvidia,
        amd: gpuInfo.amd,
        intel: gpuInfo.intel,
      },
      ffmpegHardwareAcceleration: {
        nvidia: capabilities.hasNvidiaSupport,
        vaapi: capabilities.hasVAAPISupport,
        qsv: capabilities.hasQSVSupport,
        availableHwAccels: capabilities.hwaccels.length,
      },
    });

    // Log detailed info at debug level
    this.logger.debug("Detailed GPU information", {
      gpuDetails: gpuInfo.details,
      availableHwAccels: capabilities.hwaccels,
      hardwareEncoders: capabilities.encoders,
    });
  };

  exec = async (abortSignal: AbortSignal, sourceFilePath: string): Promise<void> => {
    return new Promise((resolvePromise, reject) => {
      const { name } = parse(sourceFilePath);
      const args = this.renderAndSplitArgs(
        this.ffmpegArgs,
        resolve(sourceFilePath),
        join(resolve(this.destinationDirectory), name),
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
        subProcessLogger.info(message);
      });
    });
  };
}
