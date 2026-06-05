FROM mcr.microsoft.com/playwright:v1.44.0-jammy

USER root

WORKDIR /usr/src/app

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY package*.json ./

# Force cache bust so npm ci always runs as root
ARG CACHEBUST=1
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000
ENV PORT=3000
ENV NODE_ENV=production

CMD ["npm", "start"]
