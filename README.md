# Repository Intelligence MCP

<p align="center">
  <strong>Deep GitHub repository discovery and evidence-based analysis through the Model Context Protocol.</strong>
</p>

<p align="center">
  <a href="https://github.com/mrJoao28/Better-Git">GitHub</a> ·
  <a href="https://registry.modelcontextprotocol.io/">MCP Registry</a> ·
  <a href="https://www.npmjs.com/">npm</a>
</p>

## Overview

Repository Intelligence MCP is a read-only MCP server designed to give AI agents a structured, progressively deeper understanding of GitHub repositories.

Instead of sending an entire repository to a model at once, the server discovers the repository in stages:

```text
GitHub Repository URL
        ↓
Repository Metadata
        ↓
Recursive File Tree
        ↓
File Classification
        ↓
Stack Detection
        ↓
Relevant Files
        ↓
Imports / Exports
        ↓
Dependency Graph
        ↓
Entry Points / Features / Monorepo Detection
        ↓
Architecture Analysis
```

The goal is to provide **structured repository intelligence with evidence**, rather than relying on a model to guess how an unfamiliar codebase is organized.

## Features

### Repository discovery

- GitHub repository URL parsing
- Repository metadata discovery
- Default branch detection
- Recursive Git tree discovery
- Directory and file mapping
- File statistics

### Technology detection

The discovery layer can identify common technologies and project characteristics, including:

- JavaScript / TypeScript
- React
- Next.js
- Vite
- Node.js
- Express
- Prisma
- MongoDB
- PostgreSQL
- Docker
- GitHub Actions
- npm / pnpm / Yarn
- other stack signals derived from repository files

### File classification

Files are classified by their likely role, including:

- source
- configuration
- tests
- documentation
- dependencies
- infrastructure
- generated files
- assets
- other files

### Relevance analysis

The server scores files so that deeper analysis can focus on high-value parts of a repository instead of indiscriminately retrieving every file.

### Code structure analysis

The project can inspect:

- imports
- exports
- internal dependencies
- external packages
- entry points
- application features
- monorepo/workspace signals
- architecture patterns

### Architecture report

The architecture analysis combines discovered repository information into an architecture-oriented representation of the project.

The current implementation is intentionally evidence-oriented and read-only.

## MCP Tools

The server currently exposes the following MCP tools.

### `analyze_repository`

Performs the initial repository discovery and returns structured information such as:

- repository metadata
- branch information
- file counts
- file classifications
- detected stack
- high-relevance files

Use this as the normal starting point for analyzing a repository.

### `get_repository_structure`

Returns a structured representation of repository directories and relevant files.

Useful when an agent needs to understand **where functionality lives** before retrieving source code.

### `get_file_content`

Retrieves the contents of a specific repository file for deeper inspection.

This keeps file retrieval targeted rather than loading an entire repository into context.

### `analyze_dependencies`

Analyzes relationships between files and packages using repository imports and dependency information.

This can be used to identify architectural relationships and potential dependency hotspots.

### `get_architecture_report`

Builds an architecture-oriented report using the repository's discovered structure, stack, dependencies, entry points, features, and other signals.

## Design Principles

### Read-only by default

The current server does not:

- modify repositories;
- create commits;
- push branches;
- create pull requests;
- delete files.

Future write capabilities will be explicit, opt-in operations.

### Progressive discovery

The server avoids the inefficient pattern of retrieving every source file immediately.

Instead:

```text
Discover → Classify → Rank → Inspect → Analyze
```

This reduces unnecessary GitHub API calls and unnecessary model context usage.

### Evidence over guesses

Future analysis features are designed around structured evidence. An architectural or bug finding should eventually be able to point back to the files and relationships that support the conclusion.

### Tool composability

Each MCP tool has a focused responsibility so an agent can perform shallow or deep analysis depending on the task.

## Architecture

```text
                         GitHub
                           │
                           ▼
                  ┌─────────────────┐
                  │ GitHub Client   │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Discovery Layer │
                  └────────┬────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
      Classifier         Stack          Relevance
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                  Repository Model
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
       Imports         Dependencies      Entrypoints
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                   Architecture Layer
                           │
                           ▼
                     MCP Tools
                           │
                           ▼
                       AI Client
```

## Project Structure

```text
repository-intelligence-mcp/
│
├── src/
│   ├── discovery/
│   │   ├── analyze.ts
│   │   ├── architecture.ts
│   │   ├── classifier.ts
│   │   ├── dependency-graph.ts
│   │   ├── entrypoints.ts
│   │   ├── features.ts
│   │   ├── imports.ts
│   │   ├── monorepo.ts
│   │   ├── relevance.ts
│   │   └── stack.ts
│   │
│   ├── github/
│   │   └── client.ts
│   │
│   ├── tools/
│   │   ├── analyze-dependencies.ts
│   │   ├── analyze-repository.ts
│   │   ├── architecture-report.ts
│   │   ├── get-file-content.ts
│   │   └── get-structure.ts
│   │
│   ├── config.ts
│   ├── index.ts
│   └── types.ts
│
├── server.json
├── package.json
├── package-lock.json
├── tsconfig.json
├── LICENSE
└── README.md
```

## Requirements

- Node.js 20 or newer
- npm
- A GitHub account is recommended if you need higher GitHub API rate limits
- Optional `GITHUB_TOKEN`

## Installation

Clone the repository:

```bash
git clone https://github.com/mrJoao28/Better-Git.git
cd Better-Git
```

Install dependencies:

```bash
npm install
```

## Environment Variables

Create a `.env` file if you want to configure optional environment variables.

Example:

```env
GITHUB_TOKEN=your_github_token
```

A GitHub token is optional for public repositories, but authenticated GitHub API requests generally provide more generous rate limits.

Do not commit credentials or tokens to the repository.

## Development

Run the server directly with TypeScript:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

Run the compiled server:

```bash
npm start
```

Run TypeScript validation without generating files:

```bash
npm run typecheck
```

## MCP Inspector

The project includes an Inspector command for interactive MCP testing:

```bash
npm run inspect
```

The server uses **stdio transport**. This means the process communicates through standard input/output instead of exposing an HTTP port.

Because stdout is used by the MCP protocol, application diagnostics should be written to stderr.

## Example Workflow

An AI client can analyze a repository progressively:

```text
1. User provides a GitHub repository URL
             ↓
2. analyze_repository
             ↓
3. get_repository_structure
             ↓
4. get_file_content for high-value files
             ↓
5. analyze_dependencies
             ↓
6. get_architecture_report
             ↓
7. Future audit engines
```

For example, an agent could start with:

```text
https://github.com/mrJoao28/Better-Git
```

and progressively determine:

```text
Repository
├── Stack
├── Structure
├── Features
├── Entry Points
├── Dependencies
└── Architecture
```

## MCP Registry

The project is prepared for publication to the official MCP Registry.

Server identity:

```text
io.github.mrJoao28/repository-intelligence-mcp
```

The Registry manifest is stored in:

```text
server.json
```

The npm package declares the same MCP identity using:

```json
"mcpName": "io.github.mrJoao28/repository-intelligence-mcp"
```

The current Registry package uses the npm distribution with stdio transport.

### Validate the package

Before publishing:

```bash
npm run typecheck
npm run build
npm pack --dry-run
```

### Validate the Registry manifest

After installing the MCP publisher:

```bash
npm run validate:registry
```

### Publish to npm

```bash
npm publish
```

### Authenticate the MCP publisher

```bash
mcp-publisher login github
```

### Publish to the MCP Registry

```bash
npm run publish:registry
```

> Publishing to the Registry does not host the MCP server. The current distribution is an npm package executed through stdio. A future version may provide Streamable HTTP for remote clients.

## Package Validation

The project is designed to pass the following local validation sequence:

```bash
npm ci
npm run typecheck
npm run build
npm pack --dry-run
```

The generated npm package should contain the compiled `dist/` directory, `package.json`, `README.md`, `LICENSE`, and `server.json`.

## Security Model

The current server is intentionally read-only.

It only needs GitHub read access to inspect public repositories. If a GitHub token is configured, it should be provided through an environment variable and never committed to source control.

Future security analysis features will be designed to distinguish:

- confirmed findings;
- probable findings;
- informational findings;
- uncertain findings.

## Roadmap

### v0.2 — Repository Intelligence

- stronger dependency graph
- import/export graph improvements
- entry-point detection improvements
- monorepo/workspace analysis
- architecture graph
- framework detection improvements
- repository evidence model

### v0.3 — Audit Engine

- evidence engine
- code quality analysis
- bug detection
- security analysis
- test intelligence
- performance analysis
- circular dependency detection

### v0.4 — Architecture Intelligence

- architecture rules
- architecture boundary validation
- dependency direction rules
- hotspot detection
- Git history intelligence
- change-risk analysis

### v0.5 — UI Intelligence

- UI/UX analysis
- accessibility analysis
- responsive layout analysis
- loading/empty/error state analysis
- optional Playwright browser inspection

### v0.6 — Assisted Fixes

- suggested patches
- unified diff generation
- patch validation
- test execution
- optional branch creation
- optional pull request creation

Write operations will remain explicit and opt-in.

## Contributing

Contributions are welcome.

Recommended workflow:

```bash
git checkout -b feature/my-feature
npm ci
npm run typecheck
npm run build
```

Then open a pull request describing:

- what changed;
- why it changed;
- how it was tested;
- any limitations or follow-up work.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Author

Created by [Joao Azevedo](https://github.com/mrJoao28).

Repository: https://github.com/mrJoao28/Better-Git
