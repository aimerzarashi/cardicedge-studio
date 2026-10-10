import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// scripts/seed.ts が作る管理者
const seedAdmin = {
  email: "operator@example.com",
  password: "operator-password",
};

async function login(page: Page, account: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(account.email);
  await page.getByLabel("パスワード").fill(account.password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByTestId("operator-email")).toHaveText(account.email);
}

// better-auth は Cookie での POST に Origin を求める
async function post(
  request: APIRequestContext,
  baseURL: string,
  path: string,
  data: object,
) {
  return request.post(`/api/auth${path}`, {
    data,
    headers: { Origin: baseURL },
  });
}

async function createOperator(page: Page, baseURL: string, email: string) {
  const response = await post(page.request, baseURL, "/admin/create-user", {
    email,
    password: "operator-password",
    name: email,
  });
  expect(response.status()).toBe(200);
  return (await response.json()).user.id as string;
}

test("管理者はほかのオペレーターになりすませない", async ({
  page,
  baseURL,
}) => {
  await login(page, seedAdmin);
  const userId = await createOperator(
    page,
    baseURL ?? "",
    `impersonate-${Date.now()}@example.com`,
  );

  const response = await post(
    page.request,
    baseURL ?? "",
    "/admin/impersonate-user",
    { userId },
  );
  expect(response.status()).toBe(403);
});

test("管理者はオペレーターを削除できない", async ({ page, baseURL }) => {
  await login(page, seedAdmin);
  const userId = await createOperator(
    page,
    baseURL ?? "",
    `remove-${Date.now()}@example.com`,
  );

  const response = await post(
    page.request,
    baseURL ?? "",
    "/admin/remove-user",
    { userId },
  );
  expect(response.status()).toBe(403);
});

test("管理者はほかのオペレーターのメールアドレスを変えられない", async ({
  page,
  baseURL,
}) => {
  await login(page, seedAdmin);
  const userId = await createOperator(
    page,
    baseURL ?? "",
    `set-email-${Date.now()}@example.com`,
  );

  const response = await post(
    page.request,
    baseURL ?? "",
    "/admin/update-user",
    {
      userId,
      data: { email: `changed-${Date.now()}@example.com` },
    },
  );
  expect(response.status()).toBe(403);
});

test("管理者ではないオペレーターは管理者用の API を使えない", async ({
  page,
  baseURL,
}) => {
  await login(page, seedAdmin);
  const email = `operator-${Date.now()}@example.com`;
  await createOperator(page, baseURL ?? "", email);
  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await login(page, { email, password: "operator-password" });
  const response = await page.request.get("/api/auth/admin/list-users");
  expect(response.status()).toBe(403);
});
