# Dockerfile untuk Railway - paling sederhana dan stabil
FROM node:18-alpine

WORKDIR /app

# Copy semua file
COPY . .

# Install dependencies
RUN npm install

# Buat direktori
RUN mkdir -p uploads logs

EXPOSE 5000

CMD ["node", "src/app.js"]
