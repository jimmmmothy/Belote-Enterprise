# BUILD STAGE
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies (dev deps included)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Inject build-time env variable
ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL

# Build production bundle
RUN npm run build


# RUNTIME STAGE
FROM nginx:alpine

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built frontend
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]