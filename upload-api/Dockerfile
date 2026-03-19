FROM node:20-slim

WORKDIR /app

# Install sharp dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
  libvips-dev \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm install --production

COPY . .

# Environment variables
# Coolify env vars override these if set with "Is Literal" ✅
ENV PORT=3200
ENV NAS_BASE_PATH=/mnt/nas/onlinegalerie
ENV SUPABASE_URL=http://192.168.249.79:3100
ENV SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc3MzY5Nzk4MCwiZXhwIjo0OTI5MzcxNTgwLCJyb2xlIjoic2VydmljZV9yb2xlIn0.cpMQKU4EBO4Z5Qb-YVCOkI3rU9s3lcNFYUapzlmMpjg
ENV SUPABASE_JWT_SECRET=Yr1KkOFlwtEMlvVMYIeqIfAsfVwKfTy1
ENV ALLOWED_ORIGINS=http://debian.orca-mirfak.ts.net,https://admin.fotohahn.ch,https://galerie.fotohahn.ch

EXPOSE 3200
CMD ["node", "server.js"]
