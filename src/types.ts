export type RepositoryRef = {
  owner: string;
  repo: string;
  branch?: string;
};

export type GitTreeEntry = {
  path: string;
  mode: string;
  type: "blob" | "tree" | "commit" | string;
  sha: string;
  size?: number;
  url?: string;
};

export type RepositoryFile = {
  path: string;
  extension: string;
  category: FileCategory;
  size?: number;
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

export type RepositoryAnalysis = {
  repository: {
    owner: string;
    name: string;
    branch: string;
    url: string;
    description: string | null;
    isPrivate: boolean;
    stars: number;
    defaultBranch: string;
  };
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
