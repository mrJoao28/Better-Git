import type { RepositoryFile, RepositoryStack } from "../types.js";

const languageByExtension: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".py": "Python",
  ".go": "Go",
  ".rs": "Rust",
  ".java": "Java",
  ".kt": "Kotlin",
  ".cs": "C#",
  ".php": "PHP",
  ".rb": "Ruby",
  ".swift": "Swift",
};

const frameworkByPath: Array<[string, string]> = [
  ["next.config", "Next.js"],
  ["vite.config", "Vite"],
  ["angular.json", "Angular"],
  ["nuxt.config", "Nuxt"],
  ["astro.config", "Astro"],
  ["remix.config", "Remix"],
  ["nest-cli.json", "NestJS"],
  ["prisma", "Prisma"],
];

export function detectStack(files: RepositoryFile[]): RepositoryStack {
  const languages = new Set<string>();
  const frameworks = new Set<string>();
  const packageManagers = new Set<string>();
  const databases = new Set<string>();
  const infrastructure = new Set<string>();

  for (const file of files) {
    const lower = file.path.toLowerCase();

    const language = languageByExtension[file.extension];
    if (language) languages.add(language);

    for (const [marker, framework] of frameworkByPath) {
      if (lower.includes(marker.toLowerCase())) frameworks.add(framework);
    }

    if (lower.endsWith("package.json")) packageManagers.add("npm-compatible");
    if (lower.endsWith("pnpm-lock.yaml")) packageManagers.add("pnpm");
    if (lower.endsWith("yarn.lock")) packageManagers.add("Yarn");
    if (lower.endsWith("bun.lockb")) packageManagers.add("Bun");
    if (lower.endsWith("package-lock.json")) packageManagers.add("npm");

    if (lower.includes("prisma")) databases.add("Prisma");
    if (lower.includes("supabase")) databases.add("Supabase");
    if (lower.includes("mongoose")) databases.add("MongoDB/Mongoose");
    if (lower.includes("postgres")) databases.add("PostgreSQL");
    if (lower.includes("mysql")) databases.add("MySQL");

    if (lower.includes("docker")) infrastructure.add("Docker");
    if (lower.startsWith(".github/workflows/")) infrastructure.add("GitHub Actions");
  }

  return {
    languages: [...languages].sort(),
    frameworks: [...frameworks].sort(),
    packageManagers: [...packageManagers].sort(),
    databases: [...databases].sort(),
    infrastructure: [...infrastructure].sort(),
  };
}
