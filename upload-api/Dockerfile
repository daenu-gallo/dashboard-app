FROM node:20-slim

WORKDIR /app

# Install sharp dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  libvips-dev \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

# Environment variables - set via Coolify "Environment Variables" with "Is Literal" checked!
# Do NOT hardcode secrets here - the repo is on GitHub!
ENV PORT=3200
ENV NAS_BASE_PATH=/mnt/nas/onlinegalerie
ENV SUPABASE_URL=http://192.168.249.79:3100
ENV SUPABASE_SERVICE_ROLE_KEY=MUST_BE_SET_IN_COOLIFY
ENV SUPABASE_JWT_SECRET=MUST_BE_SET_IN_COOLIFY

EXPOSE 3200
CMD ["node", "server.js"]
