import { z } from "zod";
import { buildArchitectureReport, detectArchitecturePatterns } from "../discovery/architecture.js";
import { classifyTree } from "../discovery/classifier.js";
import { buildDependencyGraph } from "../discovery/dependency-graph.js";
import { detectEntryPoints } from "../discovery/entrypoints.js";
import { detectFeatures } from "../discovery/features.js";
import { analyzeImportsExports } from "../discovery/imports.js";
import { detectMonorepo } from "../discovery/monorepo.js";
import { rankFiles } from "../discovery/relevance.js";
import { detectStack } from "../discovery/stack.js";
import { getRecursiveTree, getRepositoryMetadata, parseGitHubRepositoryUrl } from "../github/client.js";

const DEFAULT_MAX_FILES = 80;

export const architectureReportTool = {
  name: "get_architecture_report",
  title: "Generate repository architecture report",
  description:
    "Produce a full architectural analysis of a GitHub repository: monorepo detection, entry points, feature/module boundaries, architecture pattern detection (MVC, layered, clean/hexagonal, feature-based, component-based, monorepo), and a summarized internal dependency graph. Read-only.",
  inputSchema: z.object({
    repositoryUrl: z.string().url().describe("Full GitHub repository URL"),
    maxFilesForDependencyGraph: z
      .number()
      .int()
      .positive()
      .max(300)
      .optional()
      .describe("Maximum number of source files to parse for the dependency graph (default 80)"),
  }),
  handler: async ({
    repositoryUrl,
    maxFilesForDependencyGraph,
  }: {
    repositoryUrl: string;
    maxFilesForDependencyGraph?: number | undefined;
  }) => {
    try {
      const ref = parseGitHubRepositoryUrl(repositoryUrl);
      const metadata = await getRepositoryMetadata(ref);
      const branch = ref.branch ?? metadata.default_branch;

      const entries = await getRecursiveTree(ref, branch);
      const files = rankFiles(classifyTree(entries));
      const stack = detectStack(files);

      const [monorepo, entryPoints] = await Promise.all([
        detectMonorepo(ref, files, entries),
        detectEntryPoints(ref, files, entries),
      ]);

      const features = detectFeatures(files);
      const architecture = detectArchitecturePatterns(files, monorepo);

      const fileImports = await analyzeImportsExports(
        ref,
        files,
        entries,
        maxFilesForDependencyGraph ?? DEFAULT_MAX_FILES,
      );
      const dependencyGraph = buildDependencyGraph(fileImports);

      const repository = {
        owner: metadata.owner.login,
        name: metadata.name,
        branch,
        url: metadata.html_url,
        description: metadata.description,
        isPrivate: metadata.private,
        stars: metadata.stargazers_count,
        defaultBranch: metadata.default_branch,
      };

      const report = buildArchitectureReport({
        repository,
        stack,
        monorepo,
        entryPoints,
        features,
        architecture,
        dependencyGraph,
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(report, null, 2) }],
        structuredContent: report,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: "text" as const, text: `Architecture report failed: ${message}` }],
        isError: true,
      };
    }
  },
};