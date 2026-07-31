import { z } from "zod";
import { classifyTree } from "../discovery/classifier.js";
import { buildDependencyGraph } from "../discovery/dependency-graph.js";
import { analyzeImportsExports } from "../discovery/imports.js";
import { rankFiles } from "../discovery/relevance.js";
import { getRecursiveTree, getRepositoryMetadata, parseGitHubRepositoryUrl } from "../github/client.js";

const DEFAULT_MAX_FILES = 80;

export const analyzeDependenciesTool = {
  name: "analyze_dependencies",
  title: "Analyze imports, exports, and dependency graph",
  description:
    "Parse import/export/require statements across a GitHub repository's most relevant source files and build an internal dependency graph plus the set of external packages referenced. Read-only. Bounded by maxFiles (ranked by relevance) to keep GitHub API usage predictable on large repositories.",
  inputSchema: z.object({
    repositoryUrl: z.string().url().describe("Full GitHub repository URL"),
    maxFiles: z
      .number()
      .int()
      .positive()
      .max(300)
      .optional()
      .describe("Maximum number of source files to fetch and parse (default 80, ranked by relevance)"),
  }),
  handler: async ({
    repositoryUrl,
    maxFiles,
  }: {
    repositoryUrl: string;
    maxFiles?: number | undefined;
  }) => {
    try {
      const ref = parseGitHubRepositoryUrl(repositoryUrl);
      const metadata = await getRepositoryMetadata(ref);
      const branch = ref.branch ?? metadata.default_branch;

      const entries = await getRecursiveTree(ref, branch);
      const files = rankFiles(classifyTree(entries));

      const fileImports = await analyzeImportsExports(ref, files, entries, maxFiles ?? DEFAULT_MAX_FILES);
      const graph = buildDependencyGraph(fileImports);

      const result = {
        repository: { owner: ref.owner, name: ref.repo, branch },
        filesAnalyzed: fileImports.length,
        files: fileImports,
        graph,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: "text" as const, text: `Dependency analysis failed: ${message}` }],
        isError: true,
      };
    }
  },
};