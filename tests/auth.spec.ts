import { expect, test } from "@playwright/test";

// scripts/seed.ts が作る開発・テスト用のオペレーター
const operator = {
  email: "operator@example.com",
  password: "operator-password",
};

test("未ログインでトップ画面を開くとログイン画面に移る", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "cms ログイン" }),
  ).toBeVisible();
});

test("seed のオペレーターでログインするとトップ画面にログイン中のオペレーターが表示される", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(operator.email);
  await page.getByLabel("パスワード").fill(operator.password);
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("operator-email")).toHaveText(operator.email);
});

test("パスワードが誤っているとログインできない", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(operator.email);
  await page.getByLabel("パスワード").fill("wrong-password");
  await page.getByRole("button", { name: "ログイン" }).click();

  // getByRole("alert") は Next.js のルート読み上げ用の要素にも一致するため、文言で探す
  await expect(
    page.getByText("メールアドレスまたはパスワードが正しくありません"),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("ログアウトするとログイン画面に戻り、トップ画面を開けなくなる", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(operator.email);
  await page.getByLabel("パスワード").fill(operator.password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page.getByTestId("operator-email")).toBeVisible();

  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
