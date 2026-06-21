# Production Dockerfile dengan optimasi
FROM node:18-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (hanya production)
RUN npm install --omit=dev

# Copy source code
COPY . .

# Build stage
FROM node:18-alpine

WORKDIR /app

# Copy dari deps
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app ./

# Buat direktori
RUN mkdir -p uploads logs

# Set environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start
CMD ["node", "src/app.js"]
