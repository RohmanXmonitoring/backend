# Dockerfile - Menggunakan npm install (tidak membutuhkan package-lock.json)
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies - menggunakan npm install
RUN npm install --production=false

# Copy source code
COPY . .

# Buat direktori yang diperlukan
RUN mkdir -p uploads logs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start application
CMD ["node", "src/app.js"]
