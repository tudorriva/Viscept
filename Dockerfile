# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY backend/src ./src
COPY backend/tsconfig.json .

# Build
RUN npm run build

# Expose port
EXPOSE 3001

# Start server
CMD ["npm", "start"]
