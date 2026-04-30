FROM node:20-slim

WORKDIR /app

# Install sharp dependencies + pg_dump for DB backups
RUN apt-get update && apt-get install -y --no-install-recommends \
  libvips-dev \
  postgresql-client \
  curl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

# Non-sensitive defaults only — secrets are injected via Coolify Env Vars
ENV PORT=3200
ENV NAS_BASE_PATH=/mnt/nas/onlinegalerie
# SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, ALLOWED_ORIGINS
# → Set in Coolify → Environment Variables (runtime)

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3200/api/health || exit 1

EXPOSE 3200
CMD ["node", "server.js"]
