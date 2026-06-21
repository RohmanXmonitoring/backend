# Dockerfile untuk Railway - Versi Stabil
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production=false

# Copy source code
COPY . .

# Buat direktori
RUN mkdir -p uploads logs

# Set environment
ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0

# Expose port
EXPOSE 5000

# Health check dengan timeout yang lebih lama
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=5 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)}).on('error', () => {process.exit(1)})"

# Start application
CMD ["node", "src/app.js"]
