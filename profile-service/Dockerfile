FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN npm run build
EXPOSE 4003
CMD ["node", "dist/index.js"]
