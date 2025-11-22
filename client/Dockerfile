FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./

# Include dev dependencies for build
RUN npm ci --include=dev

COPY . .

# Ensure NODE_ENV is development during build
ARG VITE_SERVER_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV NODE_ENV=development

RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]