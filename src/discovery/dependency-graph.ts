import type { DependencyGraph, FileImportExport, GraphEdge } from "../types.js";

function topLevelPackageName(specifier: string): string {
  if (specifier.startsWith("@")) {
    const parts = specifier.split("/");
    return parts.slice(0, 2).join("/");
  }
  return specifier.split("/")[0] ?? specifier;
}

/**
 * Builds a directed dependency graph from per-file import/export analysis.
 * Internal edges connect repository files to each other; external edges
 * connect a file to a normalized top-level package name (e.g. "@scope/pkg").
 */
export function buildDependencyGraph(fileImports: FileImportExport[]): DependencyGraph {
  const nodes = new Set<string>();
  const edges: GraphEdge[] = [];
  const externalPackages = new Set<string>();
  const incomingCount = new Map<string, number>();
  const outgoingCount = new Map<string, number>();

  for (const file of fileImports) {
    nodes.add(file.path);
    outgoingCount.set(file.path, (outgoingCount.get(file.path) ?? 0) + file.imports.length);

    for (const edge of file.imports) {
      if (edge.kind === "internal" && edge.resolved) {
        nodes.add(edge.resolved);
        edges.push({ from: file.path, to: edge.resolved, kind: "internal" });
        incomingCount.set(edge.resolved, (incomingCount.get(edge.resolved) ?? 0) + 1);
      } else {
        const packageName = topLevelPackageName(edge.specifier);
        externalPackages.add(packageName);
        edges.push({ from: file.path, to: packageName, kind: "external" });
      }
    }
  }

  const mostDependedOn = [...incomingCount.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const mostDependencies = [...outgoingCount.entries()]
    .map(([path, count]) => ({ path, count }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    nodes: [...nodes].sort(),
    edges,
    externalPackages: [...externalPackages].sort(),
    mostDependedOn,
    mostDependencies,
  };
}