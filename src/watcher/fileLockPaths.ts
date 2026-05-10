import { createHash } from "node:crypto";
import { basename, join, resolve } from "node:path";

const sanitizePathSegment = (value: string) => value.replace(/[^a-zA-Z0-9._-]/g, "_");

export const getLockPath = (lockDirectoryPath: string, serverName: string, sourceFile: string) => {
  const resolvedSourceFile = resolve(sourceFile);
  const hash = createHash("sha256").update(resolvedSourceFile).digest("hex");
  const name = sanitizePathSegment(basename(sourceFile));
  const sanitizedServerName = sanitizePathSegment(serverName);
  return join(lockDirectoryPath, `${sanitizedServerName}-${name}-${hash}.lock`);
};

export const getMetadataPath = (lockPath: string) => join(lockPath, "metadata.json");
