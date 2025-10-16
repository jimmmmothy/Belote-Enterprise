# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev        # only install production deps
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["npm", "run", "start"]