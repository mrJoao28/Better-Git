import { z } from "zod";
import { getFileContent, getRepositoryMetadata, parseGitHubRepositoryUrl } from "../github/client.js";

const DEFAULT_MAX_CHARS = 200_000;

export const getFileContentTool = {
  name: "get_file_content",
  title: "Get file content",
  description:
    "Retrieve the raw text content of a single file from a GitHub repository, given the repository URL and a file path. Read-only. Content is truncated beyond maxChars to protect the response size.",
  inputSchema: z.object({
    repositoryUrl: z.string().url().describe("Full GitHub repository URL"),
    path: z.string().min(1).describe("File path relative to the repository root, e.g. \"src/index.ts\""),
    maxChars: z
      .number()
      .int()
      .positive()
      .max(500_000)
      .optional()
      .describe("Maximum characters to return before truncating (default 200000)"),
  }),
  handler: async ({
    repositoryUrl,
    path,
    maxChars,
  }: {
    repositoryUrl: string;
    path: string;
    maxChars?: number | undefined;
  }) => {
    try {
      const ref = parseGitHubRepositoryUrl(repositoryUrl);
      const metadata = await getRepositoryMetadata(ref);
      const branch = ref.branch ?? metadata.default_branch;

      const file = await getFileContent(ref, path, branch);
      const limit = maxChars ?? DEFAULT_MAX_CHARS;
      const truncated = file.content.length > limit;
      const content = truncated ? file.content.slice(0, limit) : file.content;

      const result = {
        repository: { owner: ref.owner, name: ref.repo, branch },
        path,
        size: file.size,
        sha: file.sha,
        truncated,
        content,
      };

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [{ type: "text" as const, text: `File content retrieval failed: ${message}` }],
        isError: true,
      };
    }
  },
};