FROM node:22-slim

RUN apt-get update && apt-get install -y \
  python3 python3-pip ffmpeg curl git \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm tsx pm2

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/*/package.json ./packages/
COPY apps/*/package.json ./apps/
COPY skills/*/package.json ./skills/

RUN pnpm install --frozen-lockfile || pnpm install

COPY . .

RUN mkdir -p /app/data/{memory,timeline,approvals,content,videos,images,cache,logs,backups}

EXPOSE 3000 3001

CMD ["pm2-runtime", "ecosystem.config.cjs"]
