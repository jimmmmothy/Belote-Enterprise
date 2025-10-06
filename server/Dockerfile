FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
EXPOSE 3000
CMD ["npm", "start"]