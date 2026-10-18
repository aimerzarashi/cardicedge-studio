import { expect, test } from "./fixtures";

// scripts/seed.ts が作る開発・テスト用のオペレーター
const operator = {
  email: "operator@example.com",
  password: "operator-password",
};

test("未ログインでトップ画面を開くとログイン画面に移る", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "studio ログイン" }),
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

test("ハイドレーション前に送信してもパスワードが URL に載らない", async ({
  page,
}) => {
  // JavaScript を読み込ませず、ハイドレーションされない状態（回線が遅いときの読み込み途中）を再現する
  await page.route("**/_next/static/**/*.js", (route) => route.abort());
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(operator.email);
  await page.getByLabel("パスワード").fill(operator.password);

  await expect(page.getByRole("button", { name: "ログイン" })).toBeDisabled();
  await page.getByLabel("パスワード").press("Enter");

  await expect(page).toHaveURL(/\/login$/);
  expect(page.url()).not.toContain(operator.password);
});

test("ログインの試行回数が多すぎるときは、パスワードの誤りではなく待つように表示する", async ({
  page,
}) => {
  // better-auth のレート制限は本番モードでだけ有効なため、429 の応答を作って画面の表示を確かめる
  await page.route("**/api/auth/sign-in/email", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        message: "Too many requests. Please try again later.",
      }),
    }),
  );
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(operator.email);
  await page.getByLabel("パスワード").fill(operator.password);
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(
    page.getByText(
      "ログインの試行回数が多すぎます。しばらく待ってからもう一度お試しください",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("メールアドレスまたはパスワードが正しくありません"),
  ).toHaveCount(0);
});
