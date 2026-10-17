# The site as a container image, for the homelab origin on k3s-apps (#101).
# Build from the repository root (the live panel counts DNS records in infra/terraform/main.tf):
#   docker build -f site/Dockerfile --build-arg SITE_COMMIT_SHA=$(git rev-parse HEAD) .
# Same build as Cloudflare Pages, so the homelab and the fallback serve identical pages.

FROM node:24-alpine AS build
WORKDIR /src/site
COPY site/package.json site/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY site/ ./
COPY infra/terraform/main.tf /src/infra/terraform/main.tf
ARG SITE_COMMIT_SHA=""
ENV SITE_COMMIT_SHA=${SITE_COMMIT_SHA}
RUN npm run build

# Unprivileged nginx: runs as uid 101 and listens on 8080, so the pod needs no root.
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY site/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY site/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /src/site/dist /usr/share/nginx/html
ARG SITE_COMMIT_SHA=""
LABEL org.opencontainers.image.source="https://github.com/BODAPATI88/bvrinfra" \
      org.opencontainers.image.revision="${SITE_COMMIT_SHA}" \
      org.opencontainers.image.description="bvrinfra.in static site, served from the homelab"
EXPOSE 8080
