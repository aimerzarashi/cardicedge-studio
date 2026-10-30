import { defineConfig, devices } from "@playwright/test";

// ブラウザは studio-playwright コンテナで動くため、URL はコンテナ間ネットワークの名前で指定する
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
    // 落ちたテストだけ、あとから操作と通信を追えるよう残す（たまに落ちるテストは再現を探さず、起きたときの記録で調べる。studio#46）
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
