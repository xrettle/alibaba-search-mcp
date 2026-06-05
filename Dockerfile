# Use the official Microsoft Playwright base image
# This contains Node.js, Chromium, and all system libraries pre-installed
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

# Switch to root user for installing dependencies and building
USER root

# Set working directory
WORKDIR /usr/src/app

# Skip downloading browsers again during npm install since they are pre-installed
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Copy package configuration files
COPY package*.json ./

# Install application dependencies
RUN npm ci

# Copy the source code and configuration
COPY . .

# Compile TypeScript
RUN npm run build

# Expose the server port
EXPOSE 3000

# Set environment defaults
ENV PORT=3000
ENV NODE_ENV=production

# Start the Node.js Express server
CMD [ "npm", "start" ]
