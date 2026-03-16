# ---- Build Stage ----
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files first (better Docker cache)
COPY package.json package-lock.json ./

# Install dependencies (clean install for reproducibility)
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# ---- Production Stage ----
FROM nginx:alpine

# Copy built files to nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copy custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
