# Dockerfile - Production Ready
FROM node:18-alpine

# Install PM2
RUN npm install -g pm2

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

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start with PM2
CMD ["pm2-runtime", "src/app.js", "--name", "admin-backend"]
