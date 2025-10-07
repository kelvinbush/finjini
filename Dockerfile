# Production Docker build for Fastify TypeScript app (TypeScript runtime)

FROM node:18-alpine

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 fastify

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install all dependencies (including tsx for TypeScript runtime)
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force && \
    rm -rf ~/.npm

# Copy source code and config
COPY --chown=fastify:nodejs src/ ./src/
COPY --chown=fastify:nodejs tsconfig.json ./

# Create necessary directories
RUN mkdir -p /app/logs && \
    chown -R fastify:nodejs /app/logs

# Switch to non-root user
USER fastify

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Start the application with TypeScript runtime
CMD ["npm", "start"]
