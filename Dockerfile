# syntax=docker/dockerfile:1
# Local development image. Production runs on Cloudflare Workers, not this container.
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends socat ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1 \
    WRANGLER_SEND_METRICS=false

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY docker/entrypoint.sh /usr/local/bin/lhr-entrypoint
COPY . .

EXPOSE 3000 8787
ENTRYPOINT ["lhr-entrypoint"]
CMD ["npx", "next", "dev", "--hostname", "0.0.0.0", "--port", "3000"]
