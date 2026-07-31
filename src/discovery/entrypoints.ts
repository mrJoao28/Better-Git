import { getBlobContent } from "../github/client.js";
import type { EntryPoint, EntryPointKind, GitTreeEntry, RepositoryFile, RepositoryRef } from "../types.js";

const conventionEntryNames = [
  "index.ts",
  "index.js",
  "index.tsx",
  "main.ts",
  "main.js",
  "app.ts",
  "app.js",
  "server.ts",
  "server.js",
];

function normalizeRelative(path: string): string {
  return path.replace(/^\.\//, "");
}

/**
 * Detects likely entry points of a repository: package.json's main/module/bin
 * fields, conventional filenames near the project root (index/main/app/server),
 * and known server manifests (e.g. an MCP server.json).
 */
export async function detectEntryPoints(
  ref: RepositoryRef,
  files: RepositoryFile[],
  entries: GitTreeEntry[],
): Promise<EntryPoint[]> {
  const shaByPath = new Map(entries.map((entry) => [entry.path, entry.sha]));
  const knownPaths = new Set(files.map((file) => file.path));
  const entryPoints: EntryPoint[] = [];
  const seen = new Set<string>();

  const add = (path: string, kind: EntryPointKind, label: string) => {
    const normalized = normalizeRelative(path);
    if (!knownPaths.has(normalized) || seen.has(normalized)) return;
    seen.add(normalized);
    entryPoints.push({ path: normalized, kind, label });
  };

  const rootPackageSha = shaByPath.get("package.json");
  if (rootPackageSha) {
    try {
      const raw = await getBlobContent(ref, rootPackageSha);
      const pkg = JSON.parse(raw) as Record<string, unknown>;

      if (typeof pkg.main === "string") {
        add(pkg.main, "package-main", 'package.json "main"');
      }
      if (typeof pkg.module === "string") {
        add(pkg.module, "package-module", 'package.json "module"');
      }
      if (typeof pkg.bin === "string") {
        add(pkg.bin, "package-bin", 'package.json "bin"');
      } else if (pkg.bin && typeof pkg.bin === "object") {
        for (const binPath of Object.values(pkg.bin as Record<string, unknown>)) {
          if (typeof binPath === "string") add(binPath, "package-bin", 'package.json "bin"');
        }
      }
    } catch {
      // Root package.json missing or unparsable — skip manifest-derived entries.
    }
  }

  for (const file of files) {
    const filename = file.path.split("/").at(-1);
    const depth = file.path.split("/").length;
    if (filename && conventionEntryNames.includes(filename) && depth <= 3) {
      add(file.path, "convention", `Conventional entry point (${filename})`);
    }
  }

  if (knownPaths.has("server.json")) {
    add("server.json", "server-config", "MCP server manifest");
  }

  return entryPoints;
}