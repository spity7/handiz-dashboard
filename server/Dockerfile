# Use Node base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy app code
COPY . .

# Expose port
EXPOSE 5005

# Start app
CMD ["npm", "start"]
