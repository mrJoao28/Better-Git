import type { RepositoryAnalysis } from "../types.js";
import {
  classifyTree,
} from "./classifier.js";
import { detectStack } from "./stack.js";
import { rankFiles } from "./relevance.js";
import {
  getRecursiveTree,
  getRepositoryMetadata,
  parseGitHubRepositoryUrl,
} from "../github/client.js";

function directoriesFromPaths(paths: string[]): string[] {
  const directories = new Set<string>();

  for (const path of paths) {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i += 1) {
      directories.add(parts.slice(0, i).join("/"));
    }
  }

  return [...directories].sort();
}

export async function analyzeRepository(inputUrl: string): Promise<RepositoryAnalysis> {
  const ref = parseGitHubRepositoryUrl(inputUrl);
  const metadata = await getRepositoryMetadata(ref);
  const branch = ref.branch ?? metadata.default_branch;

  const tree = await getRecursiveTree(ref, branch);
  const files = rankFiles(classifyTree(tree));

  const stack = detectStack(files);

  return {
    repository: {
      owner: metadata.owner.login,
      name: metadata.name,
      branch,
      url: metadata.html_url,
      description: metadata.description,
      isPrivate: metadata.private,
      stars: metadata.stargazers_count,
      defaultBranch: metadata.default_branch,
    },
    stack,
    summary: {
      files: files.length,
      sourceFiles: files.filter((file) => file.category === "source").length,
      configFiles: files.filter((file) => file.category === "config").length,
      testFiles: files.filter((file) => file.category === "test").length,
      documentationFiles: files.filter((file) => file.category === "documentation").length,
      generatedFiles: files.filter((file) => file.category === "generated").length,
    },
    topFiles: files.slice(0, 30),
    directories: directoriesFromPaths(files.map((file) => file.path)),
  };
}
