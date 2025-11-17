# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine

WORKDIR /app

# Install only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy prisma schema + generated client
COPY prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Copy compiled TS code
COPY --from=build /app/dist ./dist

# Run migrations and generate Prisma client at container start
CMD npx prisma generate && npx prisma migrate deploy && npm run start