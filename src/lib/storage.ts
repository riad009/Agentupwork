import path from "node:path";
import { env } from "@/lib/env";
import { NotFoundError } from "@/lib/errors";

/** Absolute root under which every generated artefact (screenshots, PDFs) lives. */
export function storageRoot(): string {
  return path.resolve(process.cwd(), env.STORAGE_DIR);
}

export function storagePath(...segments: string[]): string {
  return path.join(storageRoot(), ...segments);
}

/**
 * Resolves a stored relative path and refuses anything that escapes the storage
 * root. Paths come from our own writers, but containment is checked anyway so a
 * corrupted row can never be turned into an arbitrary file read.
 */
export function resolveStoredFile(storedPath: string): string {
  const root = storageRoot();
  const absolute = path.resolve(process.cwd(), storedPath);
  const relative = path.relative(root, absolute);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new NotFoundError("That file is not available.");
  }

  return absolute;
}
