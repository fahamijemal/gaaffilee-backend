# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency files first (layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code and prisma schema
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json tsconfig.build.json nest-cli.json ./

# Generate Prisma client
RUN pnpm prisma:generate

# Build the NestJS app
RUN pnpm build

# ── Production stage ──────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install pnpm (needed for prisma:migrate:deploy script)
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy Prisma schema + migrations (needed for migrate deploy)
COPY prisma ./prisma

# Copy generated Prisma client from builder
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma ./node_modules/.prisma

# Copy compiled app from builder
COPY --from=builder /app/dist ./dist

# Use non-root user for security
USER node

EXPOSE 4000

# Run migrations then start the app
CMD ["sh", "-c", "npx prisma@5.22.0 migrate deploy && node dist/src/main.js"]
