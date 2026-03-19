# ---- Build Stage ----
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files first (better Docker cache)
COPY package.json package-lock.json ./

# Install dependencies (clean install for reproducibility)
RUN npm ci

# Copy source code
COPY . .

# Write Supabase environment variables for Vite build
# Note: ANON_KEY is a public client-side key (safe to include)
RUN echo "VITE_SUPABASE_URL=http://debian.orca-mirfak.ts.net:3100" > .env && \
    echo "VITE_SUPABASE_ANON_KEY=eyJ0eXAiOiAiSldUIiwgImFsZyI6ICJIUzI1NiJ9.eyJpc3MiOiAic3VwYWJhc2UiLCAiaWF0IjogMTc3MzY5Nzk4MCwgImV4cCI6IDQ5MjkzNzE1ODAsICJyb2xlIjogImFub24ifQ.ACzAXp4dSB2ZZAkY2R2DokthvJ-tDwlEnGHsxi_F5lc" >> .env && \
    echo "VITE_UPLOAD_API_URL=http://debian.orca-mirfak.ts.net:3200" >> .env

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
