# Product reader server with Chromium (Playwright). The image tag MUST match the playwright version in package-lock.json (1.65.0).
FROM mcr.microsoft.com/playwright:v1.65.0-noble
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY server ./server
ENV NODE_ENV=production
ENV PORT=10000
EXPOSE 10000
CMD ["node", "server/index.js"]
