import { getBlobContent } from "../github/client.js";
import type { GitTreeEntry, MonorepoInfo, MonorepoTool, RepositoryFile, RepositoryRef } from "../types.js";

const conventionDirs = ["packages", "apps", "services", "libs"];

function isUnderConventionDir(dir: string): boolean {
  return conventionDirs.some((candidate) => dir === candidate || dir.startsWith(`${candidate}/`));
}

async function readJsonBlob(
  ref: RepositoryRef,
  shaByPath: Map<string, string>,
  path: string,
): Promise<Record<string, unknown> | null> {
  const sha = shaByPath.get(path);
  if (!sha) return null;

  try {
    const raw = await getBlobContent(ref, sha);
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Detects whether a repository is a monorepo, which tooling manages it
 * (npm/yarn/pnpm workspaces, Turborepo, Nx, Lerna, or plain convention),
 * and enumerates the individual packages it contains.
 */
export async function detectMonorepo(
  ref: RepositoryRef,
  files: RepositoryFile[],
  entries: GitTreeEntry[],
): Promise<MonorepoInfo> {
  const paths = new Set(files.map((file) => file.path));
  const shaByPath = new Map(entries.map((entry) => [entry.path, entry.sha]));

  let tool: MonorepoTool | null = null;
  if (paths.has("pnpm-workspace.yaml")) tool = "pnpm workspaces";
  else if (paths.has("turbo.json")) tool = "Turborepo";
  else if (paths.has("nx.json")) tool = "Nx";
  else if (paths.has("lerna.json")) tool = "Lerna";

  const workspaceGlobs: string[] = [];
  const rootPackageJson = await readJsonBlob(ref, shaByPath, "package.json");

  if (rootPackageJson) {
    const workspaces = rootPackageJson.workspaces;
    if (Array.isArray(workspaces)) {
      workspaceGlobs.push(...workspaces.filter((entry): entry is string => typeof entry === "string"));
      if (!tool) tool = "npm/yarn workspaces";
    } else if (
      workspaces &&
      typeof workspaces === "object" &&
      Array.isArray((workspaces as { packages?: unknown }).packages)
    ) {
      workspaceGlobs.push(
        ...((workspaces as { packages: unknown[] }).packages.filter(
          (entry): entry is string => typeof entry === "string",
        )),
      );
      if (!tool) tool = "npm/yarn workspaces";
    }
  }

  const packageJsonDirs = files
    .filter((file) => file.path.endsWith("/package.json") && file.path !== "package.json")
    .map((file) => file.path.slice(0, -"/package.json".length));

  const matchesConvention = packageJsonDirs.some(isUnderConventionDir);
  const isMonorepo =
    tool !== null || workspaceGlobs.length > 0 || packageJsonDirs.length > 1 || matchesConvention;

  if (isMonorepo && !tool) {
    tool = matchesConvention ? "convention-based (packages/apps)" : "multiple package.json";
  }

  const packages: MonorepoInfo["packages"] = [];
  for (const dir of packageJsonDirs) {
    const pkg = await readJsonBlob(ref, shaByPath, `${dir}/package.json`);
    const name = typeof pkg?.name === "string" ? pkg.name : dir;
    packages.push({ name, path: dir });
  }

  return {
    isMonorepo,
    tool,
    packages: packages.sort((a, b) => a.path.localeCompare(b.path)),
  };
}