# ---- Build Stage ----
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files first (better Docker cache)
COPY package.json package-lock.json ./

# Install dependencies (clean install for reproducibility)
RUN npm ci

# Copy source code
COPY .  .

# Build args from Coolify (set in Coolify → Environment Variables → Build)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_UPLOAD_API_URL
ARG VITE_GALLERY_BASE_DOMAIN

# Debug: show what build args arrived (truncated for security)
RUN echo "=== Build Args ===" && \
    echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL:0:30}..." && \
    echo "VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY:0:20}..." && \
    echo "VITE_UPLOAD_API_URL=${VITE_UPLOAD_API_URL}" && \
    echo "VITE_GALLERY_BASE_DOMAIN=${VITE_GALLERY_BASE_DOMAIN}" && \
    echo "=================="

# Write Supabase environment variables for Vite build
RUN echo "VITE_SUPABASE_URL=${VITE_SUPABASE_URL}" > .env && \
    echo "VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}" >> .env && \
    echo "VITE_UPLOAD_API_URL=${VITE_UPLOAD_API_URL}" >> .env && \
    echo "VITE_GALLERY_BASE_DOMAIN=${VITE_GALLERY_BASE_DOMAIN}" >> .env

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
