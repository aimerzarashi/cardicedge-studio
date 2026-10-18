import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 本番用イメージ（.build/Dockerfile）で node server.js として動かすため
  output: "standalone",
  reactCompiler: true,
  // 開発サーバーへのアクセス元として許可するホスト
  // - studio-envoy: Playwright のブラウザ（別コンテナ）が envoy 経由でアクセスする
  // - *.trycloudflare.com: make tunnel の Quick Tunnel 経由でアクセスする
  allowedDevOrigins: ["studio-envoy", "*.trycloudflare.com"],
};

export default nextConfig;
