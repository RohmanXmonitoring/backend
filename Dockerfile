# Dockerfile Production - Versi Final
FROM node:18-alpine

# Install PM2
RUN npm install -g pm2

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies - tanpa omit dev
RUN npm install

# Copy source code
COPY . .

# Buat direktori yang diperlukan
RUN mkdir -p uploads logs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start with PM2
CMD ["pm2-runtime", "src/app.js", "--name", "admin-backend"]
