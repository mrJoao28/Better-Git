import { Octokit } from "@octokit/rest";
import { config } from "../config.js";
import type { GitTreeEntry, RepositoryRef } from "../types.js";

export function createGitHubClient(): Octokit {
  return new Octokit({
    auth: config.githubToken,
    userAgent: `${config.serverName}/${config.serverVersion}`,
  });
}

export function parseGitHubRepositoryUrl(input: string): RepositoryRef {
  const value = input.trim();

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid repository URL.");
  }

  if (url.hostname !== "github.com") {
    throw new Error("Only github.com repository URLs are supported in this MVP.");
  }

  const parts = url.pathname.split("/").filter(Boolean);

  if (parts.length < 2) {
    throw new Error("GitHub URL must contain an owner and repository name.");
  }

  const owner = parts[0];
  const repo = parts[1]?.replace(/\.git$/, "");

  if (!owner || !repo) {
    throw new Error("Could not parse GitHub owner/repository.");
  }

  const branch =
    parts[2] === "tree" && parts[3]
      ? decodeURIComponent(parts.slice(3).join("/"))
      : undefined;

  return { owner, repo, branch };
}

export async function getRepositoryMetadata(ref: RepositoryRef) {
  const github = createGitHubClient();

  const response = await github.repos.get({
    owner: ref.owner,
    repo: ref.repo,
  });

  return response.data;
}

export async function getRecursiveTree(
  ref: RepositoryRef,
  branch: string,
): Promise<GitTreeEntry[]> {
  const github = createGitHubClient();

  const response = await github.git.getTree({
    owner: ref.owner,
    repo: ref.repo,
    tree_sha: branch,
    recursive: "true",
  });

  if (response.data.truncated) {
    throw new Error(
      "GitHub truncated the repository tree. A future large-repository mode must paginate or partition the analysis.",
    );
  }

  return response.data.tree
    .filter(
      (entry): entry is typeof entry & { path: string; type: string; sha: string; mode: string } =>
        Boolean(entry.path && entry.type && entry.sha && entry.mode),
    )
    .map((entry) => ({
      path: entry.path,
      mode: entry.mode,
      type: entry.type,
      sha: entry.sha,
      size: "size" in entry && typeof entry.size === "number" ? entry.size : undefined,
      url: "url" in entry && typeof entry.url === "string" ? entry.url : undefined,
    }));
}
