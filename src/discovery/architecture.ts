import type {
  ArchitecturePattern,
  ArchitectureReport,
  DependencyGraph,
  EntryPoint,
  FeatureModule,
  MonorepoInfo,
  RepositoryFile,
  RepositoryMetadataSummary,
  RepositoryStack,
} from "../types.js";

const layerSignals: Array<{ pattern: string; markers: string[] }> = [
  { pattern: "MVC (Model-View-Controller)", markers: ["controllers", "models", "views"] },
  { pattern: "Layered (routes/services/repositories)", markers: ["routes", "services", "repositories"] },
  { pattern: "Layered (controllers/services)", markers: ["controllers", "services"] },
  { pattern: "Clean/Hexagonal Architecture", markers: ["domain", "usecases", "infrastructure"] },
  { pattern: "Feature-based / Modular", markers: ["features", "modules"] },
  { pattern: "Component-based frontend", markers: ["components", "hooks", "pages"] },
];

/**
 * Detects architecture patterns using directory-name signals (e.g. the
 * co-existence of controllers/ + services/ + repositories/ implies a layered
 * architecture) plus monorepo status. Confidence is the fraction of a
 * pattern's marker directories that were actually found.
 */
export function detectArchitecturePatterns(
  files: RepositoryFile[],
  monorepo: MonorepoInfo,
): ArchitecturePattern[] {
  const dirSet = new Set(
    files.flatMap((file) => file.path.split("/").slice(0, -1).map((dir) => dir.toLowerCase())),
  );

  const patterns: ArchitecturePattern[] = [];

  for (const signal of layerSignals) {
    const matched = signal.markers.filter((marker) => dirSet.has(marker));
    if (matched.length >= 2) {
      patterns.push({
        pattern: signal.pattern,
        confidence: Math.round((matched.length / signal.markers.length) * 100),
        evidence: matched.map((marker) => `directory "${marker}/" present`),
      });
    }
  }

  if (monorepo.isMonorepo) {
    patterns.push({
      pattern: "Monorepo",
      confidence: 90,
      evidence: [
        monorepo.tool ? `Detected via ${monorepo.tool}` : "Multiple package.json files found",
        `${monorepo.packages.length} package(s) discovered`,
      ],
    });
  }

  if (patterns.length === 0) {
    patterns.push({
      pattern: "Flat / Single-module",
      confidence: 50,
      evidence: ["No layered, clean, or feature-based directory conventions detected"],
    });
  }

  return patterns.sort((a, b) => b.confidence - a.confidence);
}

/** Assembles the final architecture report consumed by the MCP tool layer. */
export function buildArchitectureReport(params: {
  repository: RepositoryMetadataSummary;
  stack: RepositoryStack;
  monorepo: MonorepoInfo;
  entryPoints: EntryPoint[];
  features: FeatureModule[];
  architecture: ArchitecturePattern[];
  dependencyGraph: DependencyGraph;
}): ArchitectureReport {
  return {
    repository: params.repository,
    stack: params.stack,
    monorepo: params.monorepo,
    entryPoints: params.entryPoints,
    features: params.features,
    architecture: params.architecture,
    dependencyGraph: {
      totalFiles: params.dependencyGraph.nodes.length,
      totalInternalEdges: params.dependencyGraph.edges.filter((edge) => edge.kind === "internal")
        .length,
      externalPackages: params.dependencyGraph.externalPackages,
      mostDependedOn: params.dependencyGraph.mostDependedOn,
    },
  };
}