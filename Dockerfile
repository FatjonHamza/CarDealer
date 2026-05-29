# syntax=docker/dockerfile:1.7

# ----------------------------------------------------------------------------
# Korean Automotive Kosova — Next.js 15 + better-sqlite3 on Railway
#
# Three stages: deps (install + compile native modules), builder (next build),
# runner (slim image with just the standalone server output).
#
# DB persistence: mount a Railway volume at /data and set DB_PATH=/data/cardealer.db
# ----------------------------------------------------------------------------

FROM node:22-bookworm-slim AS deps
# better-sqlite3 builds a native binding via node-gyp → needs python3 + gcc.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci


FROM node:22-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Next standalone bundle + static assets + public files.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# better-sqlite3 is declared in `serverExternalPackages`, so Next does not
# bundle it. Copy the module tree explicitly so the prebuilt `.node` binary
# is present at runtime.
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/node_modules/bindings ./node_modules/bindings
COPY --from=builder /app/node_modules/file-uri-to-path ./node_modules/file-uri-to-path

EXPOSE 3000
CMD ["node", "server.js"]
