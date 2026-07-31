# Repository Intelligence MCP

Read-only MCP server for deep GitHub repository discovery and evidence-based analysis.

## What it does

Give the MCP a GitHub repository URL and it can progressively discover:

- repository metadata and default branch;
- recursive repository structure;
- source/config/test/documentation/generated files;
- languages, frameworks, package managers, databases and infrastructure;
- relevant files for deeper analysis;
- file contents;
- dependency relationships;
- an architecture-oriented report.

The server is currently **read-only**. It does not create commits, modify repositories, or open pull requests.

## MCP tools

- `analyze_repository` — discover repository metadata, stack, file statistics and high-value files.
- `get_repository_structure` — return directories and relevant files.
- `get_file_content` — retrieve a repository file when deeper inspection is needed.
- `analyze_dependencies` — inspect dependency relationships available from the repository.
- `architecture_report` — build an architecture-oriented report from discovered repository data.

## Registry identity

```text
io.github.mrJoao28/repository-intelligence-mcp
```

The repository metadata for the MCP Registry is stored in `server.json`.

The npm package declares the same identity through `mcpName` in `package.json`.

## Requirements

- Node.js 20+
- npm
- Optional `GITHUB_TOKEN` for higher GitHub API rate limits

## Local development

```bash
npm install
npm run typecheck
npm run build
npm start
```

For development:

```bash
npm run dev
```

For the MCP Inspector:

```bash
npm run inspect
```

The server uses stdio. Application logs must go to stderr so stdout remains available for the MCP protocol.

## Registry / npm publishing

The project is prepared for the official MCP Registry and npm package publishing.

Before the first publish, make sure the npm package name is available and the version in `package.json`, `server.json`, and the published npm package is identical.

Build and inspect the package:

```bash
npm run typecheck
npm run build
npm pack --dry-run
```

Publish to npm:

```bash
npm publish
```

Authenticate the MCP publisher with the GitHub account that owns the namespace:

```bash
mcp-publisher login github
```

Validate the manifest:

```bash
npm run validate:registry
```

Publish to the MCP Registry:

```bash
npm run publish:registry
```

## Current transport

The Registry manifest currently declares a **stdio npm package**. Registry listing does not host the server itself. A future version can add Streamable HTTP for remote clients.

## Roadmap

### v0.2

- stronger dependency graph
- import/export graph
- entrypoint detection
- monorepo/workspace detection
- architecture graph
- improved framework detection

### v0.3

- evidence engine
- bug analysis
- security analysis
- test analysis
- performance analysis

### v0.4

- UI/UX analysis
- optional Playwright browser analysis

### v0.5

- explicit fix generation
- patch validation
- test execution
- optional pull request creation

All modification capabilities will remain opt-in and disabled by default.
