FROM node:20-alpine

WORKDIR /app

# Copy backend files
COPY backend/package*.json ./

RUN npm ci

COPY backend .

# Build
RUN npm run build

# Start
EXPOSE 3001
CMD ["npm", "start"]