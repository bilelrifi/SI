# Stage 1: Build the React app with Vite
FROM docker.io/node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Serve the build with Nginx
FROM docker.io/nginx:alpine

# Copy the Vite build output to Nginx’s web directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose the Nginx default port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
