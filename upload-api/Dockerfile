FROM node:20-slim

WORKDIR /app

# Install sharp dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  libvips-dev \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

# Bake environment variables into the image
# (Coolify env var passthrough doesn't work reliably for public repo apps)
ENV PORT=3200
ENV NAS_BASE_PATH=/mnt/nas/onlinegalerie
ENV SUPABASE_URL=http://debian.orca-mirfak.ts.net:3100
ENV SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzY5Nzk4MCwiZXhwIjo0OTI5MzcxNTgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.XfBJBnLaBiDlMaBUNPaWc1pCH2N6s4_vaEjraI15xxQ

EXPOSE 3200
CMD ["node", "server.js"]
