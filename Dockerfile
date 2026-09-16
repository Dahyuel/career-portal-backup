# ============================
# Stage 1: Build the application
# ============================
FROM node:20.17-alpine3.20 AS build

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build the production bundle (env vars come from .env file created by CI)
RUN npm run build

# ============================
# Stage 2: Serve with Nginx
# ============================
FROM nginx:1.27-alpine3.20 AS production

# OCI image labels (populated by CI build args, with sensible defaults)
ARG BUILD_DATE="unknown"
ARG VCS_REF="unknown"
ARG VERSION="dev"
LABEL org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.title="career-portal" \
      org.opencontainers.image.description="Career Portal – Nginx-served SPA" \
      org.opencontainers.image.source="https://github.com/Dahyuel/career-portal"

# Copy custom Nginx configuration for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built files from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Create a non-root user and fix ownership
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /usr/share/nginx/html \
    && chown -R appuser:appgroup /var/cache/nginx \
    && chown -R appuser:appgroup /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown appuser:appgroup /var/run/nginx.pid

USER appuser

# Expose port 3000 (proxied by host Nginx on 80/443)
EXPOSE 3000

# Health check — verify Nginx is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
