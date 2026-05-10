export type FileLockReleaseOptions = {
  completed: boolean;
};

export type FileLock = {
  sourceFile: string;
  lockPath: string;
  release: (options?: FileLockReleaseOptions) => Promise<void>;
};

export type LockMetadata = {
  serverName: string;
  runId: string;
  sourceFile: string;
  sourceSize: number;
  sourceModifiedAtMs: number;
  createdAt: string;
  status: "active" | "completed";
  completedAt?: string;
};
