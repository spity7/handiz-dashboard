# Use Node base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (lockfile required for reproducible builds)
RUN npm ci --omit=dev

# Copy app code
COPY . .

# Expose port
EXPOSE 5016

# Start app
CMD ["npm", "start"]
