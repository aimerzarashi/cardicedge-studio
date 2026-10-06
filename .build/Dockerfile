# 本番用イメージ。next build の standalone 出力だけを node で動かす。
# make test のテスト用環境（compose.test.yaml）でも使う
ARG NODE_IMAGE=node:24.21.0-bookworm-slim

# pnpm の取得専用ステージ。curl はここでだけ使い、以降のステージには残さない
FROM ${NODE_IMAGE} AS pnpm
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
# package.json の packageManager と版を揃える
ARG PNPM_VERSION=12.9.1
ENV PNPM_HOME=/pnpm
RUN curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=$PNPM_VERSION SHELL=bash sh -

# ビルド
FROM ${NODE_IMAGE} AS build
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME/bin:$PATH
COPY --from=pnpm /pnpm /pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# 実行
FROM ${NODE_IMAGE}
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ARG BUILD_VERSION=v0.0.0
ENV APP_VERSION=$BUILD_VERSION
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
