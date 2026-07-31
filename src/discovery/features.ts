import type { FeatureModule, RepositoryFile } from "../types.js";

const rootCandidates = ["src", "app", "lib", "packages", "apps", "services", "features", "modules"];

/**
 * Heuristically detects feature/module boundaries by grouping files under
 * the second path segment inside a recognized root (src/, app/, packages/,
 * etc.) — e.g. "src/billing/*" becomes a "billing" feature module.
 */
export function detectFeatures(files: RepositoryFile[]): FeatureModule[] {
  const counts = new Map<string, number>();

  for (const file of files) {
    if (file.category === "generated" || file.category === "asset") continue;

    const parts = file.path.split("/");

    for (const root of rootCandidates) {
      const rootIndex = parts.indexOf(root);
      if (rootIndex !== -1 && parts.length > rootIndex + 2) {
        const featurePath = parts.slice(0, rootIndex + 2).join("/");
        counts.set(featurePath, (counts.get(featurePath) ?? 0) + 1);
        break;
      }
    }
  }

  return [...counts.entries()]
    .map(([path, fileCount]) => ({
      name: path.split("/").at(-1) ?? path,
      path,
      fileCount,
    }))
    .filter((feature) => feature.fileCount >= 2)
    .sort((a, b) => b.fileCount - a.fileCount)
    .slice(0, 25);
}