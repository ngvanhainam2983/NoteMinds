# Multi-stage Dockerfile for NoteMind

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm install --omit=dev
COPY client/ ./
RUN npm run build

# Stage 2: Backend Runtime
FROM node:20-alpine AS backend

WORKDIR /app

# Install production dependencies
COPY server/package*.json ./
RUN npm install --omit=dev

# Copy server code
COPY server/ ./

# Copy built frontend
COPY --from=frontend-builder /app/client/dist ./public

# Create necessary directories
RUN mkdir -p data uploads exports logs uploads/avatars

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "index.js"]
