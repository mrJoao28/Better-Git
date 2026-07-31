FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY server.json ./
COPY README.md ./
COPY LICENSE ./

RUN npm run typecheck && npm run build && npm prune --omit=dev

FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV MCP_HTTP_HOST=0.0.0.0
ENV MCP_HTTP_PORT=3000

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.json ./server.json
COPY --from=build /app/README.md ./README.md
COPY --from=build /app/LICENSE ./LICENSE

EXPOSE 3000

CMD ["node", "dist/http.js"]
