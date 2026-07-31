export type RepositoryRef = {
  owner: string;
  repo: string;
  branch?: string | undefined;
};

export type GitTreeEntry = {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit" | string;
  sha: string;
  size?: number | undefined;
  url?: string | undefined;
};

export type RepositoryFile = {
  path: string;
  extension: string;
  category: FileCategory;
  size?: number | undefined;
  relevance: number;
};

export type FileCategory =
  | "source"
  | "config"
  | "test"
  | "documentation"
  | "dependency"
  | "infrastructure"
  | "generated"
  | "asset"
  | "unknown";

export type RepositoryStack = {
  languages: string[];
  frameworks: string[];
  packageManagers: string[];
  databases: string[];
  infrastructure: string[];
};

export type RepositoryMetadataSummary = {
  owner: string;
  name: string;
  branch: string;
  url: string;
  description: string | null;
  isPrivate: boolean;
  stars: number;
  defaultBranch: string;
};

export type RepositoryAnalysis = {
  repository: RepositoryMetadataSummary;
  stack: RepositoryStack;
  summary: {
    files: number;
    sourceFiles: number;
    configFiles: number;
    testFiles: number;
    documentationFiles: number;
    generatedFiles: number;
  };
  topFiles: RepositoryFile[];
  directories: string[];
};

// --- v0.2 additions -------------------------------------------------------

export type ImportKind = "internal" | "external";

export type ImportEdge = {
  specifier: string;
  resolved: string | null;
  kind: ImportKind;
};

export type FileImportExport = {
  path: string;
  imports: ImportEdge[];
  exports: string[];
};

export type GraphEdge = {
  from: string;
  to: string;
  kind: ImportKind;
};

export type DependencyGraph = {
  nodes: string[];
  edges: GraphEdge[];
  externalPackages: string[];
  mostDependedOn: Array<{ path: string; count: number }>;
  mostDependencies: Array<{ path: string; count: number }>;
};

export type MonorepoTool =
  | "npm/yarn workspaces"
  | "pnpm workspaces"
  | "Turborepo"
  | "Nx"
  | "Lerna"
  | "convention-based (packages/apps)"
  | "multiple package.json";

export type MonorepoInfo = {
  isMonorepo: boolean;
  tool: MonorepoTool | null;
  packages: Array<{ name: string; path: string }>;
};

export type EntryPointKind =
  | "package-main"
  | "package-module"
  | "package-bin"
  | "convention"
  | "server-config";

export type EntryPoint = {
  path: string;
  kind: EntryPointKind;
  label: string;
};

export type FeatureModule = {
  name: string;
  path: string;
  fileCount: number;
};

export type ArchitecturePattern = {
  pattern: string;
  confidence: number;
  evidence: string[];
};

export type ArchitectureReport = {
  repository: RepositoryMetadataSummary;
  stack: RepositoryStack;
  monorepo: MonorepoInfo;
  entryPoints: EntryPoint[];
  features: FeatureModule[];
  architecture: ArchitecturePattern[];
  dependencyGraph: {
    totalFiles: number;
    totalInternalEdges: number;
    externalPackages: string[];
    mostDependedOn: Array<{ path: string; count: number }>;
  };
};