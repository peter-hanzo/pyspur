# Base stage
FROM node:23-alpine as base
WORKDIR /pyspur/frontend
COPY package*.json ./

# Development stage
FROM base as development
RUN npm install
# Development-specific instructions here

# Production stage
FROM base as production
RUN npm ci --only=production
COPY . .
RUN npm run build
# Production-specific instructions here
