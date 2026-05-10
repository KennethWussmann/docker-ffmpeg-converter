import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, readFile, rm } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import type { Logger } from "winston";

export type FileLock = {
  sourceFile: string;
  lockPath: string;
  release: () => Promise<void>;
};

type LockMetadata = {
  serverName: string;
  runId: string;
  sourceFile: string;
  createdAt: string;
};

export class FileLockService {
  private readonly runId = randomUUID();

  constructor(
    private logger: Logger,
    private serverName: string,
    private lockEnabled: boolean,
    private lockDirectoryPath: string,
    private lockStaleAfterSeconds: number,
  ) {}

  initialize = async () => {
    if (!this.lockEnabled) {
      this.logger.info("File locking is disabled", { serverName: this.serverName });
      return;
    }

    await mkdir(this.lockDirectoryPath, { recursive: true });
    this.logger.info("Initialized file lock service", {
      serverName: this.serverName,
      runId: this.runId,
      lockDirectoryPath: this.lockDirectoryPath,
      lockStaleAfterSeconds: this.lockStaleAfterSeconds,
    });
  };

  acquire = async (sourceFile: string): Promise<FileLock | undefined> => {
    if (!this.lockEnabled) {
      return this.toUnlockedFile(sourceFile);
    }

    const lockPath = this.getLockPath(sourceFile);
    const metadata = this.createMetadata(sourceFile);

    try {
      await this.createLock(lockPath, metadata);
      this.logger.debug("Acquired file lock", { sourceFile, lockPath });
      return this.toFileLock(sourceFile, lockPath);
    } catch (error) {
      if (!this.isFileExistsError(error)) {
        this.logger.error("Failed to acquire file lock", { sourceFile, lockPath, error });
        return undefined;
      }

      return this.handleExistingLock(sourceFile, lockPath, metadata);
    }
  };

  private handleExistingLock = async (
    sourceFile: string,
    lockPath: string,
    metadata: LockMetadata,
  ): Promise<FileLock | undefined> => {
    const existingLock = await this.readLock(lockPath);

    if (!existingLock) {
      this.logger.warn("Skipping file because an unreadable lock exists", { sourceFile, lockPath });
      return undefined;
    }

    if (!this.isReclaimable(existingLock)) {
      this.logger.info("Skipping file because it is locked", {
        sourceFile,
        lockPath,
        existingLock,
      });
      return undefined;
    }

    this.logger.warn("Reclaiming stale file lock", { sourceFile, lockPath, existingLock });
    await rm(lockPath, { force: true });

    try {
      await this.createLock(lockPath, metadata);
      this.logger.debug("Acquired reclaimed file lock", { sourceFile, lockPath });
      return this.toFileLock(sourceFile, lockPath);
    } catch (error) {
      this.logger.info("Skipping file because stale lock was claimed by another process", {
        sourceFile,
        lockPath,
        error,
      });
      return undefined;
    }
  };

  private createLock = async (lockPath: string, metadata: LockMetadata) => {
    const fileHandle = await open(
      lockPath,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
    );
    try {
      await fileHandle.writeFile(JSON.stringify(metadata));
    } finally {
      await fileHandle.close();
    }
  };

  private toUnlockedFile = (sourceFile: string): FileLock => ({
    sourceFile,
    lockPath: "",
    release: async () => {},
  });

  private toFileLock = (sourceFile: string, lockPath: string): FileLock => ({
    sourceFile,
    lockPath,
    release: async () => {
      const existingLock = await this.readLock(lockPath);

      if (!existingLock) {
        await rm(lockPath, { force: true });
        return;
      }

      if (existingLock.runId !== this.runId) {
        this.logger.warn("Not releasing file lock because it belongs to another run", {
          sourceFile,
          lockPath,
          existingLock,
          runId: this.runId,
        });
        return;
      }

      await rm(lockPath, { force: true });
      this.logger.debug("Released file lock", { sourceFile, lockPath });
    },
  });

  private createMetadata = (sourceFile: string): LockMetadata => ({
    serverName: this.serverName,
    runId: this.runId,
    sourceFile: resolve(sourceFile),
    createdAt: new Date().toISOString(),
  });

  private readLock = async (lockPath: string): Promise<LockMetadata | undefined> => {
    try {
      const content = await readFile(lockPath, "utf8");
      return JSON.parse(content) as LockMetadata;
    } catch (error) {
      this.logger.warn("Failed to read file lock", { lockPath, error });
      return undefined;
    }
  };

  private isReclaimable = (metadata: LockMetadata) => {
    if (this.lockStaleAfterSeconds <= 0) {
      return false;
    }

    if (metadata.serverName !== this.serverName) {
      return false;
    }

    const createdAt = Date.parse(metadata.createdAt);

    if (Number.isNaN(createdAt)) {
      return false;
    }

    return Date.now() - createdAt > this.lockStaleAfterSeconds * 1000;
  };

  private getLockPath = (sourceFile: string) => {
    const resolvedSourceFile = resolve(sourceFile);
    const hash = createHash("sha256").update(resolvedSourceFile).digest("hex");
    const name = basename(sourceFile).replace(/[^a-zA-Z0-9._-]/g, "_");
    const serverName = this.serverName.replace(/[^a-zA-Z0-9._-]/g, "_");
    return join(this.lockDirectoryPath, `${serverName}-${name}-${hash}.lock`);
  };

  private isFileExistsError = (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}
