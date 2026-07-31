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

The server supports both **stdio** for local MCP clients and **Streamable HTTP** for remote MCP clients.

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

Performs the initial repository discovery and returns structured information such as repository metadata, branch information, file counts, file classifications, detected stack, and high-relevance files.

### `get_repository_structure`

Returns a structured representation of repository directories and relevant files.

### `get_file_content`

Retrieves the contents of a specific repository file for deeper inspection.

### `analyze_dependencies`

Analyzes relationships between files and packages using repository imports and dependency information.

### `get_architecture_report`

Builds an architecture-oriented report using the repository's discovered structure, stack, dependencies, entry points, features, and other signals.

## Design Principles

### Read-only by default

The current server does not modify repositories, create commits, push branches, create pull requests, or delete files.

Future write capabilities will be explicit, opt-in operations.

### Progressive discovery

The server avoids retrieving every source file immediately.

```text
Discover → Classify → Rank → Inspect → Analyze
```

### Evidence over guesses

Future audit features are designed around structured evidence. Findings should eventually point back to the files and relationships that support the conclusion.

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
                 ┌─────────┴─────────┐
                 ▼                   ▼
               stdio            Streamable HTTP
                 │                   │
                 ▼                   ▼
           Local Clients        Remote Clients
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
│   ├── http.ts
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

```bash
git clone https://github.com/mrJoao28/Better-Git.git
cd Better-Git
npm install
```

## Environment Variables

Create a `.env` file when configuration is needed:

```env
GITHUB_TOKEN=your_github_token
```

### Remote HTTP configuration

The HTTP server supports:

```env
MCP_HTTP_HOST=127.0.0.1
MCP_HTTP_PORT=3000
MCP_HTTP_TOKEN=replace-with-a-secret-token
MCP_ALLOWED_ORIGINS=https://your-client.example
```

For a public deployment, set a strong `MCP_HTTP_TOKEN` or replace this simple bearer-token layer with a production OAuth authorization system appropriate for your host.

Do not commit credentials or tokens to the repository.

## Development

### stdio

Run the local MCP server:

```bash
npm run dev
```

### Streamable HTTP

Run the remote-capable MCP server locally:

```bash
npm run dev:http
```

The MCP endpoint is:

```text
http://127.0.0.1:3000/mcp
```

Health check:

```text
http://127.0.0.1:3000/health
```

The HTTP server uses the MCP Streamable HTTP transport and supports POST/GET/DELETE on `/mcp` for session-based clients.

### Build

```bash
npm run build
```

Run the compiled stdio server:

```bash
npm start
```

Run the compiled HTTP server:

```bash
npm run start:http
```

Run TypeScript validation without generating files:

```bash
npm run typecheck
```

## MCP Inspector

For stdio:

```bash
npm run inspect
```

For Streamable HTTP, start the HTTP server first and then use:

```bash
npm run inspect:http
```

The server uses **stdio transport** for local process-spawned clients and **Streamable HTTP** for remote clients.

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

The current Registry package declares the npm distribution with stdio transport. The repository also contains the Streamable HTTP entry point for remote deployments.

### Validate the package

```bash
npm ci
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

> Publishing to the Registry does not host the MCP server. The current Registry distribution is an npm package executed through stdio. A remote Registry entry can be added after the Streamable HTTP server is deployed to a stable HTTPS endpoint.

## Remote Deployment

The HTTP entry point is designed to be deployed as a long-running Node.js process on a platform such as a container host, VM, or Node-compatible application platform.

A production deployment should expose:

```text
https://your-domain.example/mcp
```

and:

```text
https://your-domain.example/health
```

Before exposing the endpoint publicly:

1. configure HTTPS;
2. configure authentication;
3. configure an explicit origin allow-list when browser clients are involved;
4. keep GitHub credentials in platform secrets;
5. add rate limiting at the hosting/proxy layer;
6. monitor session and process resources.

The MCP protocol requires HTTP servers to validate request origins and recommends authentication for network-accessible servers. The implementation therefore rejects unknown `Origin` values when an origin allow-list is configured and supports an optional bearer token. For a production service, use the authentication mechanism required by the target MCP client and deployment environment.

## Package Validation

The project should pass:

```bash
npm ci
npm run typecheck
npm run build
npm pack --dry-run
```

The generated npm package contains the compiled `dist/` directory, `package.json`, `README.md`, `LICENSE`, and `server.json`.

## Security Model

The repository analysis layer is read-only.

The HTTP server adds a separate network boundary. If `MCP_HTTP_TOKEN` is configured, clients must send:

```text
Authorization: Bearer <token>
```

For local HTTP development, the default host is `127.0.0.1`. For public deployment, use HTTPS and a proper authentication/authorization solution.

Future security analysis features will distinguish:

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

```bash
git checkout -b feature/my-feature
npm ci
npm run typecheck
npm run build
```

Then open a pull request describing what changed, why it changed, how it was tested, and any limitations or follow-up work.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Author

Created by [Joao Azevedo](https://github.com/mrJoao28).

Repository: https://github.com/mrJoao28/Better-Git
