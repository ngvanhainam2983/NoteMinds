# Multi-stage build for NoteMind
# Stage 1: Build client
FROM node:20-alpine AS client-builder

WORKDIR /app/client

COPY client/package*.json ./

RUN npm ci --only=production

COPY client/ .

RUN npm run build

# Stage 2: Build server runtime
FROM node:20-alpine AS server-builder

WORKDIR /app/server

COPY server/package*.json ./

RUN npm ci --only=production

# Stage 3: Final runtime image
FROM node:20-alpine

LABEL maintainer="NoteMind Team"
LABEL description="NoteMind - AI-powered note assistant with encryption"

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Copy server dependencies from builder
COPY --from=server-builder /app/server/node_modules ./server/node_modules

# Copy server code
COPY server/ ./server/

# Copy built client from builder
COPY --from=client-builder /app/client/dist ./server/public

# Create necessary directories
RUN mkdir -p /app/server/data /app/server/uploads /app/logs

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3001}/health || exit 1

# Expose port
EXPOSE ${PORT:-3001}

# Use dumb-init to handle signals properly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Start application
CMD ["node", "server/index.js"]
