# ---------------------------------------------------------------------------
# Build stage — npm (NOT yarn: this project standardized on npm in T5.1;
# yarn hard-fails the Node engine check on some hosts). Uses package-lock.json.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Vite bakes VITE_API_URL at build time. Default `/api` = same-origin (nginx
# proxies /api and /signal to the backend). For a separate API host, build with
# --build-arg VITE_API_URL=https://api.<env>.example.com/api instead.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---------------------------------------------------------------------------
# Serve stage — nginx serves the SPA and reverse-proxies API + WebRTC signaling.
# nginx.conf is a template; the official image runs envsubst on ${BACKEND_URL}.
# ---------------------------------------------------------------------------
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
