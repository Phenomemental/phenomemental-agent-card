import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export function ensureDirectoryFor(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function readJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJsonAtomic(filePath, value) {
  ensureDirectoryFor(filePath);
  const tempPath = `${filePath}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(tempPath, filePath);
}

export function appendJsonLine(filePath, value) {
  ensureDirectoryFor(filePath);
  writeFileSync(filePath, `${JSON.stringify(value)}\n`, { encoding: "utf8", flag: "a" });
}
