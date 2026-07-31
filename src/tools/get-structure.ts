import { z } from "zod";
import { analyzeRepository } from "../discovery/analyze.js";

export const getStructureTool = {
  name: "get_repository_structure",
  title: "Get repository structure",
  description:
    "Return the discovered directory structure and relevant files for a GitHub repository URL. Read-only.",
  inputSchema: z.object({
    repositoryUrl: z.string().url().describe("Full GitHub repository URL"),
  }),
  handler: async ({ repositoryUrl }: { repositoryUrl: string }) => {
    try {
      const result = await analyzeRepository(repositoryUrl);

      const structure = {
        repository: result.repository,
        stack: result.stack,
        directories: result.directories,
        topFiles: result.topFiles,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(structure, null, 2),
          },
        ],
        structuredContent: structure,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: "text" as const, text: `Structure discovery failed: ${message}` }],
        isError: true,
      };
    }
  },
};
