import { z } from "zod";
import { analyzeRepository } from "../discovery/analyze.js";

export const analyzeRepositoryTool = {
  name: "analyze_repository",
  title: "Analyze GitHub repository",
  description:
    "Discover a GitHub repository from its URL. Returns metadata, detected stack, file statistics, directories, and the most relevant files. Read-only.",
  inputSchema: z.object({
    repositoryUrl: z.string().url().describe("Full GitHub repository URL"),
  }),
  handler: async ({ repositoryUrl }: { repositoryUrl: string }) => {
    try {
      const result = await analyzeRepository(repositoryUrl);

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: "text" as const, text: `Repository analysis failed: ${message}` }],
        isError: true,
      };
    }
  },
};
