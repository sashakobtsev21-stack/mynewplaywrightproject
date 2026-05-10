# Use the official Playwright image — pinned to the same version as the npm dep
# so browser binaries and the test runner stay in sync. Bump both together.
FROM mcr.microsoft.com/playwright:v1.55.0-jammy

WORKDIR /app

# Install deps first for layer caching
COPY package*.json ./
RUN npm ci --no-audit --no-fund

# Source comes after deps so editing tests doesn't bust the deps layer
COPY . .

ENV CI=1

# Default: run the full suite. Override per-need, e.g.:
#   docker compose run --rm tests npm run test:smoke
CMD ["npx", "playwright", "test"]
