FROM node:20-slim

WORKDIR /app

# Install sharp dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  libvips-dev \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

# Environment variables (defaults, can be overridden by Coolify)
ENV PORT=3200
ENV NAS_BASE_PATH=/mnt/nas/onlinegalerie

# Write .env file for dotenv (Coolify env var passthrough fallback)
ARG SUPABASE_URL
ARG SUPABASE_SERVICE_ROLE_KEY
ARG SUPABASE_JWT_SECRET
RUN echo "PORT=3200" > .env && \
    echo "NAS_BASE_PATH=/mnt/nas/onlinegalerie" >> .env

EXPOSE 3200
CMD ["node", "server.js"]
