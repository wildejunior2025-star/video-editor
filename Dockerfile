FROM node:20-slim

# FFmpeg + Chromium + fontes Liberation (compatível com Arial) + dependências do Chromium
RUN apt-get update && apt-get install -y \
  ffmpeg \
  chromium \
  fonts-liberation \
  fonts-noto-color-emoji \
  ca-certificates \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libpangocairo-1.0-0 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxss1 \
  libxtst6 \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Puppeteer usa o Chromium do sistema
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3333

EXPOSE 3333

CMD ["npm", "start"]
