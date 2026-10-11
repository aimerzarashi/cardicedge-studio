import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "./fixtures";

// scripts/seed.ts が作る管理者
const seedAdmin = {
  email: "operator@example.com",
  password: "operator-password",
};
// 公開の入口（envoy の 10000）と、テスト用の環境だけにある中継役用の入口（10001）
const publicURL = process.env.PLAYWRIGHT_PUBLIC_URL;
const relayURL = process.env.PLAYWRIGHT_RELAY_URL;

// ログインしてセッションに記録された IP を返す。better-auth は Cookie での POST に Origin を求める
async function loginAndGetSessionIp(
  request: APIRequestContext,
  origin: string,
) {
  const login = await request.post("/api/auth/sign-in/email", {
    data: seedAdmin,
    headers: { Origin: origin },
  });
  expect(login.status()).toBe(200);
  const session = await (await request.get("/api/auth/get-session")).json();
  return session.session.ipAddress as string;
}

test("公開の入口で X-Forwarded-For・x-client-ip を偽装しても、記録される IP は変わらない", async ({
  playwright,
}) => {
  if (!publicURL) throw new Error("PLAYWRIGHT_PUBLIC_URL が未設定です");
  const request = await playwright.request.newContext({
    baseURL: publicURL,
    extraHTTPHeaders: {
      "X-Forwarded-For": "203.0.113.10",
      "x-client-ip": "203.0.113.11",
    },
  });

  const ip = await loginAndGetSessionIp(request, publicURL);
  expect(ip).toBeTruthy();
  expect(["203.0.113.10", "203.0.113.11"]).not.toContain(ip);
  await request.dispose();
});

test("中継役用の入口では、X-Forwarded-For で名乗った IP が記録される", async ({
  playwright,
  extraHTTPHeaders,
}) => {
  // テストの URL（PLAYWRIGHT_BASE_URL）は Tunnel 等に向けることがあるため、中継役用の入口の有無は別の変数で判定する
  test.skip(!relayURL, "中継役用の入口はテスト用の環境（make test）にだけある");
  const request = await playwright.request.newContext({
    baseURL: relayURL,
    extraHTTPHeaders,
  });

  const ip = await loginAndGetSessionIp(request, relayURL ?? "");
  expect(ip).toBe(extraHTTPHeaders?.["X-Forwarded-For"]);
  await request.dispose();
});
