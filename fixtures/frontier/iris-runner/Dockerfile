# Official Playwright Noble image, OCI manifest pinned at v1.64.1.
FROM mcr.microsoft.com/playwright@sha256:2f05f8a734509a7b3f26a912639488ee08f58a7b292d14d62271bcff9038768f
WORKDIR /opt/iris
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY runner.mjs ./
USER 1000:1000
