ARG NODE_IMAGE=node:24.21.0-bookworm-slim

# pnpm の取得専用ステージ。curl はここでだけ使い、最終イメージには残さない
FROM ${NODE_IMAGE} AS pnpm

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

USER node

# pnpm は公式のスタンドアロン版（ネイティブ実行ファイル）を入れる。
# corepack は Node.js 25 以降に同梱されないため使わない。package.json の packageManager と版を揃える
ARG PNPM_VERSION=12.16.1
ENV PNPM_HOME=/home/node/.local/share/pnpm
ENV PATH=$PNPM_HOME/bin:$PATH
RUN curl -fsSL https://get.pnpm.io/install.sh | env PNPM_VERSION=$PNPM_VERSION SHELL=bash sh - \
  && pnpm --version

# 開発用イメージ
FROM ${NODE_IMAGE}

# ホストのユーザー(uid 1000)と同じ node ユーザーで動かし、生成物を root 所有にしない
USER node
WORKDIR /home/node/app

# pnpm はインストール先のパスを前提にしているため、同じパスへコピーする
ENV PNPM_HOME=/home/node/.local/share/pnpm
ENV PATH=$PNPM_HOME/bin:$PATH
COPY --from=pnpm --chown=node:node /home/node/.local/share/pnpm /home/node/.local/share/pnpm
RUN pnpm --version

# ボリュームは初回作成時にマウント先の所有者を引き継ぐため、node 所有で作っておく
RUN mkdir -p /home/node/.cache
