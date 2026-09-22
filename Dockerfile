# Two stages: build the React bundle, then run the API that serves it.
# One process, one port — the browser stays on a single origin, so the auth
# cookie works without CORS and without a proxy in front.

FROM node:22-bookworm-slim AS client
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:22-bookworm-slim
# Prisma's query engine needs libssl at runtime.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate

COPY --from=client /app/frontend/dist /app/frontend/dist

EXPOSE 4000
# Migrations run on boot, so a fresh database comes up ready.
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
