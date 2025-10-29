FROM node:18-alpine

# Install dependencies for node-canvas and Pango
RUN apk add --no-cache \
    build-base \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    fontconfig \
    ttf-dejavu \
    font-noto

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./

# Install Node dependencies
RUN npm install --production=false

# Copy application source
COPY . .

# Build TypeScript
RUN npm run build

# Create necessary directories
RUN mkdir -p /tmp/canvas-fonts \
    && mkdir -p /tmp/fontconfig-cache \
    && mkdir -p storage/previews

# Expose port
EXPOSE 1337

# Set environment variables
ENV NODE_ENV=production
ENV TEMP_DIR=/tmp/canvas-fonts
ENV FONTCONFIG_PATH=/app/fontconfig

# Start application
CMD ["node", "app.js"]
