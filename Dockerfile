# Dockerfile that mirrors Railway nixpacks environment
# Based on nixpacks.toml: nodejs_20, npm-9_x, tesseract4, poppler_utils

FROM node:20-bullseye-slim

# Install system dependencies (mirrors nixpacks apt packages)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (mirrors nixpacks install phase)
RUN npm ci --only=production

# Copy application files
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Expose port (Railway auto-assigns, local default is 3000)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start command (mirrors nixpacks start phase)
CMD ["node", "server.js"]
