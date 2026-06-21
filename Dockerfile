# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install PM2
RUN npm install -g pm2

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app ./

# Create uploads directory
RUN mkdir -p uploads && chown -R node:node uploads

# Create logs directory
RUN mkdir -p logs && chown -R node:node logs

# Use non-root user
USER node

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start with PM2
CMD ["pm2-runtime", "src/app.js"]
