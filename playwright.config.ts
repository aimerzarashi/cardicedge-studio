import { defineConfig, devices } from "@playwright/test";

// ブラウザは cms-playwright コンテナで動くため、URL はコンテナ間ネットワークの名前で指定する
const wsEndpoint = process.env.PLAYWRIGHT_WS_ENDPOINT;
const baseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!wsEndpoint || !baseURL) {
  throw new Error(
    "PLAYWRIGHT_WS_ENDPOINT / PLAYWRIGHT_BASE_URL が未設定です。make test で実行してください",
  );
}

export default defineConfig({
  testDir: "./tests",
  reporter: "list",
  use: {
    baseURL,
    connectOptions: { wsEndpoint },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
