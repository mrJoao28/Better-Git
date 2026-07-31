import { getBlobContent } from "../github/client.js";
import type {
  FileImportExport,
  GitTreeEntry,
  ImportEdge,
  RepositoryFile,
  RepositoryRef,
} from "../types.js";

const analyzableExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const specifierPatterns: RegExp[] = [
  /import\s+[^"'()]*?\bfrom\s+["']([^"']+)["']/g,
  /import\s+["']([^"']+)["']\s*;?/g,
  /export\s+[^"'()]*?\bfrom\s+["']([^"']+)["']/g,
  /require\(\s*["']([^"']+)["']\s*\)/g,
  /import\(\s*["']([^"']+)["']\s*\)/g,
];

const namedExportPatterns: RegExp[] = [
  /export\s+(?:async\s+)?function\s+([A-Za-z0-9_$]+)/g,
  /export\s+class\s+([A-Za-z0-9_$]+)/g,
  /export\s+const\s+([A-Za-z0-9_$]+)/g,
  /export\s+let\s+([A-Za-z0-9_$]+)/g,
  /export\s+(?:type|interface)\s+([A-Za-z0-9_$]+)/g,
];

/**
 * Extracts every module specifier referenced by an import/export/require/
 * dynamic-import statement in the given source text. Regex-based on purpose:
 * this project intentionally avoids a full TypeScript/Babel parser dependency
 * so it stays fast and dependency-light for read-only discovery.
 */
export function extractSpecifiers(source: string): string[] {
  const specifiers = new Set<string>();

  for (const pattern of specifierPatterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      const specifier = match[1];
      if (specifier) specifiers.add(specifier);
    }
  }

  return [...specifiers];
}

/** Extracts named export identifiers plus a synthetic "default" marker. */
export function extractExports(source: string): string[] {
  const names = new Set<string>();

  for (const pattern of namedExportPatterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source)) !== null) {
      const name = match[1];
      if (name) names.add(name);
    }
  }

  if (/export\s+default\b/.test(source)) {
    names.add("default");
  }

  return [...names];
}

/**
 * Resolves a relative import specifier (./foo, ../bar) against the set of
 * known repository paths, trying common TS/JS extensions and index files.
 * Returns null for bare specifiers (external packages) or unresolved paths.
 */
export function resolveRelativeImport(
  fromPath: string,
  specifier: string,
  knownPaths: Set<string>,
): string | null {
  if (!specifier.startsWith(".")) return null;

  const fromDir = fromPath.split("/").slice(0, -1);
  const stack = [...fromDir];

  for (const segment of specifier.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") stack.pop();
    else stack.push(segment);
  }

  const base = stack.join("/");
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
    `${base}/index.js`,
  ];

  return candidates.find((candidate) => knownPaths.has(candidate)) ?? null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R | null>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function runNext(): Promise<void> {
    const current = index;
    index += 1;
    if (current >= items.length) return;

    const item = items[current];
    if (item !== undefined) {
      const result = await worker(item);
      if (result !== null) results.push(result);
    }
    await runNext();
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runNext());
  await Promise.all(workers);

  return results;
}

/**
 * Fetches and statically analyzes import/export statements for the most
 * relevant source files in a repository. Bounded by `maxFiles` to keep the
 * number of GitHub API calls predictable on large repositories.
 */
export async function analyzeImportsExports(
  ref: RepositoryRef,
  files: RepositoryFile[],
  entries: GitTreeEntry[],
  maxFiles: number,
): Promise<FileImportExport[]> {
  const knownPaths = new Set(files.map((file) => file.path));
  const shaByPath = new Map(entries.map((entry) => [entry.path, entry.sha]));

  const targets = files
    .filter((file) => file.category === "source" && analyzableExtensions.has(file.extension))
    .slice()
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, maxFiles);

  const analyzed = await mapWithConcurrency(targets, 6, async (file) => {
    const sha = shaByPath.get(file.path);
    if (!sha) return null;

    let source: string;
    try {
      source = await getBlobContent(ref, sha);
    } catch {
      return null;
    }

    const imports: ImportEdge[] = extractSpecifiers(source).map((specifier) => {
      const resolved = resolveRelativeImport(file.path, specifier, knownPaths);
      return {
        specifier,
        resolved,
        kind: resolved ? "internal" : "external",
      };
    });

    const result: FileImportExport = {
      path: file.path,
      imports,
      exports: extractExports(source),
    };

    return result;
  });

  return analyzed.sort((a, b) => a.path.localeCompare(b.path));
}