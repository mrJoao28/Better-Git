import type { FileCategory, RepositoryFile } from "../types.js";
import type { GitTreeEntry } from "../types.js";

const generatedPathPatterns = [
  /^node_modules\//,
  /^\.next\//,
  /^dist\//,
  /^build\//,
  /^coverage\//,
  /^out\//,
  /^\.turbo\//,
  /^\.cache\//,
];

const testPatterns = [
  /(^|\/)__tests__(\/|$)/,
  /\.(test|spec)\.[^.]+$/,
  /(^|\/)tests?(\/|$)/,
];

const configNames = new Set([
  "package.json",
  "tsconfig.json",
  "jsconfig.json",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "vite.config.ts",
  "vite.config.js",
  "tailwind.config.ts",
  "tailwind.config.js",
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.ts",
  "prisma.schema",
  "schema.prisma",
  "dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  ".env.example",
]);

const documentationExtensions = new Set([".md", ".mdx", ".txt"]);

const sourceExtensions = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".cs",
  ".php",
  ".rb",
  ".swift",
]);

function extensionOf(path: string): string {
  const file = path.split("/").at(-1) ?? path;
  const index = file.lastIndexOf(".");
  return index > 0 ? file.slice(index).toLowerCase() : "";
}

export function classifyPath(path: string): FileCategory {
  const normalized = path.toLowerCase();
  const filename = normalized.split("/").at(-1) ?? normalized;
  const extension = extensionOf(normalized);

  if (generatedPathPatterns.some((pattern) => pattern.test(normalized))) {
    return "generated";
  }

  if (testPatterns.some((pattern) => pattern.test(normalized))) {
    return "test";
  }

  if (configNames.has(filename) || filename.startsWith(".env")) {
    return "config";
  }

  if (documentationExtensions.has(extension)) {
    return "documentation";
  }

  if (
    ["dockerfile", "docker-compose.yml", "docker-compose.yaml"].includes(filename) ||
    normalized.startsWith(".github/")
  ) {
    return "infrastructure";
  }

  if (
    [".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg", ".woff", ".woff2"].includes(
      extension,
    )
  ) {
    return "asset";
  }

  if (sourceExtensions.has(extension)) {
    return "source";
  }

  if (["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"].includes(filename)) {
    return "dependency";
  }

  return "unknown";
}

export function classifyTree(entries: GitTreeEntry[]): RepositoryFile[] {
  return entries
    .filter((entry) => entry.type === "blob")
    .map((entry) => {
      const category = classifyPath(entry.path);
      const extension = extensionOf(entry.path);

      return {
        path: entry.path,
        extension,
        category,
        size: entry.size,
        relevance: 0,
      };
    });
}
