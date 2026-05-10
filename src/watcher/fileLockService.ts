import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Logger } from "winston";
import { getLockPath, getMetadataPath } from "./fileLockPaths";
import type { FileLock, LockMetadata } from "./fileLockTypes";

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
    this.logger.info("Initialized lock directory service", {
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

    const lockPath = getLockPath(this.lockDirectoryPath, this.serverName, sourceFile);
    const metadata = await this.createMetadata(sourceFile);

    try {
      await this.createLock(lockPath, metadata);
      this.logger.debug("Acquired lock directory", { sourceFile, lockPath });
      return this.toFileLock(sourceFile, lockPath);
    } catch (error) {
      if (!this.isFileExistsError(error)) {
        this.logger.error("Failed to acquire lock directory", { sourceFile, lockPath, error });
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

    if (!existingLock && !(await this.isUnreadableLockReclaimable(lockPath))) {
      this.logger.warn("Skipping file because an unreadable lock directory exists", {
        sourceFile,
        lockPath,
      });
      return undefined;
    }

    if (existingLock?.status === "completed") {
      if (await this.isCompletedLockCurrent(existingLock, sourceFile)) {
        this.logger.debug("Skipping file because it was already completed", {
          sourceFile,
          lockPath,
          existingLock,
        });
        return undefined;
      }

      this.logger.info("Reprocessing file because completed lock is outdated", {
        sourceFile,
        lockPath,
        existingLock,
      });
    } else if (existingLock && !this.isReclaimable(existingLock)) {
      this.logger.info("Skipping file because it is locked", {
        sourceFile,
        lockPath,
        existingLock,
      });
      return undefined;
    }

    const reclaimPath = `${lockPath}.reclaiming-${this.runId}-${randomUUID()}`;

    try {
      await rename(lockPath, reclaimPath);
    } catch (error) {
      this.logger.info(
        "Skipping file because stale lock directory was claimed by another process",
        {
          sourceFile,
          lockPath,
          error,
        },
      );
      return undefined;
    }

    this.logger.warn("Reclaiming stale lock directory", {
      sourceFile,
      lockPath,
      reclaimPath,
      existingLock,
    });
    await rm(reclaimPath, { recursive: true, force: true });

    try {
      await this.createLock(lockPath, metadata);
      this.logger.debug("Acquired reclaimed lock directory", { sourceFile, lockPath });
      return this.toFileLock(sourceFile, lockPath);
    } catch (error) {
      this.logger.info(
        "Skipping file because reclaimed lock directory was claimed by another process",
        {
          sourceFile,
          lockPath,
          error,
        },
      );
      return undefined;
    }
  };

  private createLock = async (lockPath: string, metadata: LockMetadata) => {
    await mkdir(lockPath);

    try {
      await writeFile(getMetadataPath(lockPath), JSON.stringify(metadata));
    } catch (error) {
      await rm(lockPath, { recursive: true, force: true });
      throw error;
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
    release: async (options) => {
      const existingLock = await this.readLock(lockPath);

      if (!existingLock) {
        await rm(lockPath, { recursive: true, force: true });
        return;
      }

      if (existingLock.runId !== this.runId) {
        this.logger.warn("Not releasing lock directory because it belongs to another run", {
          sourceFile,
          lockPath,
          existingLock,
          runId: this.runId,
        });
        return;
      }

      if (options?.completed) {
        await writeFile(
          getMetadataPath(lockPath),
          JSON.stringify({
            ...existingLock,
            status: "completed",
            completedAt: new Date().toISOString(),
          }),
        );
        this.logger.debug("Marked lock directory as completed", { sourceFile, lockPath });
        return;
      }

      await rm(lockPath, { recursive: true, force: true });
      this.logger.debug("Released lock directory", { sourceFile, lockPath });
    },
  });

  private createMetadata = async (sourceFile: string): Promise<LockMetadata> => {
    const sourceStats = await stat(sourceFile);

    return {
      serverName: this.serverName,
      runId: this.runId,
      sourceFile: resolve(sourceFile),
      sourceSize: sourceStats.size,
      sourceModifiedAtMs: sourceStats.mtimeMs,
      createdAt: new Date().toISOString(),
      status: "active",
    };
  };

  private readLock = async (lockPath: string): Promise<LockMetadata | undefined> => {
    try {
      const content = await readFile(getMetadataPath(lockPath), "utf8");
      return JSON.parse(content) as LockMetadata;
    } catch (error) {
      this.logger.warn("Failed to read lock directory", { lockPath, error });
      return undefined;
    }
  };

  private isReclaimable = (metadata: LockMetadata) => {
    if (this.lockStaleAfterSeconds <= 0) {
      return false;
    }

    if (metadata.status === "completed") {
      return false;
    }

    if (metadata.serverName !== this.serverName) {
      return false;
    }

    const createdAt = Date.parse(metadata.createdAt);

    if (Number.isNaN(createdAt)) {
      return false;
    }

    return this.isStale(createdAt);
  };

  private isCompletedLockCurrent = async (metadata: LockMetadata, sourceFile: string) => {
    try {
      const sourceStats = await stat(sourceFile);
      return (
        metadata.sourceSize === sourceStats.size &&
        metadata.sourceModifiedAtMs === sourceStats.mtimeMs
      );
    } catch (error) {
      this.logger.warn("Failed to stat source file for completed lock", { sourceFile, error });
      return true;
    }
  };

  private isUnreadableLockReclaimable = async (lockPath: string) => {
    if (this.lockStaleAfterSeconds <= 0) {
      return false;
    }

    try {
      const stats = await stat(lockPath);
      return this.isStale(stats.mtimeMs);
    } catch (error) {
      this.logger.warn("Failed to stat unreadable lock directory", { lockPath, error });
      return false;
    }
  };

  private isStale = (timestamp: number) =>
    Date.now() - timestamp > this.lockStaleAfterSeconds * 1000;

  private isFileExistsError = (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}
