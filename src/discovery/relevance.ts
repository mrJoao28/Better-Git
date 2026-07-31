import type { RepositoryFile } from "../types.js";

const highValueNames = new Set([
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
  "next.config.ts",
  "next.config.js",
  "next.config.mjs",
  "vite.config.ts",
  "vite.config.js",
  "README.md",
  "Dockerfile",
]);

export function scoreFile(file: RepositoryFile): number {
  let score = 10;

  if (file.category === "config") score += 55;
  if (file.category === "source") score += 35;
  if (file.category === "test") score += 20;
  if (file.category === "documentation") score += 20;
  if (file.category === "infrastructure") score += 35;
  if (file.category === "generated") score = 0;
  if (file.category === "asset") score = 2;

  const name = file.path.split("/").at(-1) ?? file.path;
  if (highValueNames.has(name)) score += 30;

  if (/^(src|app|server|api|lib|features|packages)\//.test(file.path)) {
    score += 10;
  }

  if (file.size !== undefined && file.size > 200_000) {
    score -= 15;
  }

  return Math.max(0, Math.min(100, score));
}

export function rankFiles(files: RepositoryFile[]): RepositoryFile[] {
  return files
    .map((file) => ({ ...file, relevance: scoreFile(file) }))
    .sort((a, b) => b.relevance - a.relevance);
}
