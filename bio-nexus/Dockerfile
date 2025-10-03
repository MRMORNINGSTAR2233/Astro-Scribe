# Bio-Nexus Dockerfile
# Multi-stage build for Next.js application with AI services

# Build stage
FROM node:20.11-alpine AS builder

WORKDIR /app

# Install curl for health checks and dependencies for PDF processing
RUN apk add --no-cache curl build-base python3 poppler-utils tesseract-ocr

# Copy package files for better caching
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm@latest && \
    pnpm config set store-dir /tmp/pnpm-store && \
    pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Create test directory structure with placeholder PDF
RUN mkdir -p test/data && \
    echo "%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 21 >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Test PDF) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000010 00000 n\n0000000059 00000 n\n0000000118 00000 n\n0000000217 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n307\n%%EOF" > test/data/05-versions-space.pdf

# Build the application with production flag to skip tests
RUN NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production pnpm build

# Production stage - using Node.js with security patches
FROM node:20.12-alpine AS runner

WORKDIR /app

# Install runtime dependencies for PDF processing and health checks
# Update packages first to get security patches
RUN apk update && \
    apk upgrade && \
    apk add --no-cache curl poppler-utils tesseract-ocr ca-certificates && \
    npm install -g pnpm@latest

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only (skip frozen lockfile check)
RUN pnpm config set store-dir /tmp/pnpm-store && \
    pnpm install --prod --no-frozen-lockfile

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/database ./database

# Copy necessary config files
COPY next.config.mjs ./
COPY tsconfig.json ./
COPY postcss.config.mjs ./
COPY components.json ./

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Create logs and uploads directories
RUN mkdir -p logs uploads temp && \
    chown -R nextjs:nodejs /app

# Create cache directories with proper permissions
RUN mkdir -p .next/cache && \
    chmod -R 777 .next/cache

# Switch to non-root user for security
USER nextjs

# Expose port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV NEXT_SHARP_PATH=/app/node_modules/sharp

# Enhanced health check with timeout
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application with optimized settings
CMD ["pnpm", "start"]