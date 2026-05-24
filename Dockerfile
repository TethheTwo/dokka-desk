FROM oven/bun:1.2-slim AS base
WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build the application
FROM install AS build
COPY . .
ENV NODE_ENV=production
RUN bun run build

# Final image
FROM base AS release
RUN apt-get update && apt-get install -y curl texlive-latex-base texlive-latex-extra texlive-fonts-recommended texlive-lang-spanish texlive-xetex poppler-utils fonts-liberation && fc-cache -fv && rm -rf /var/lib/apt/lists/*
COPY --from=install /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/server-entry.js ./server-entry.js
COPY entrypoint.sh /entrypoint.sh

EXPOSE 3000
ENV NODE_ENV=production
ENTRYPOINT ["/entrypoint.sh"]
