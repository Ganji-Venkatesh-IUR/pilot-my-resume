# --------------------------------------------------------------------------
# CareerPilot AI — production container
#
# The app is a TanStack Start full-stack bundle: the same build ships the React
# client and the server functions that act as the API layer (the FastAPI-style
# backend boundary). Multi-stage keeps the runtime image small and free of
# build tooling.
# --------------------------------------------------------------------------

# ---------- stage 1: install dependencies (cached separately from source) ----
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock* bunfig.toml ./
RUN bun install --frozen-lockfile

# ---------- stage 2: build ---------------------------------------------------
FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# VITE_* values are inlined at build time, so they must be present here.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
RUN bun run build

# ---------- stage 3: runtime -------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000
# Never run as root in production.
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.output ./.output
USER app
EXPOSE 3000
# Server-only secrets (SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, LOVABLE_API_KEY)
# are injected at runtime by the platform — never baked into the image.
CMD ["node", ".output/server/index.mjs"]
