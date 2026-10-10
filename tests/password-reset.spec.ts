import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { countMails, resetPasswordPath } from "./mail";

// scripts/seed.ts が作る管理者と、cms の起動時に INITIAL_ADMIN_EMAIL で作られる最初の管理者（パスワード無し）
const seedAdmin = {
  email: "operator@example.com",
  password: "operator-password",
};
const initialAdminEmail = "admin@example.com";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();
}

// 「パスワードを忘れた」からメールを送り、届いたリンクで新しいパスワードを設定する
async function setPasswordByMail(
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string,
) {
  const since = new Date();
  await page.goto("/login");
  await page
    .getByRole("link", { name: "パスワードを忘れた・初めて設定する" })
    .click();
  // ログイン画面にも同じ名前の欄があるため、画面が切り替わってから入力する
  await expect(page).toHaveURL(/\/forgot-password$/);
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByRole("button", { name: "メールを送る" }).click();
  await expect(
    page.getByText(
      "登録されているアドレスであれば、パスワードを設定するメールを送りました",
    ),
  ).toBeVisible();

  await page.goto(await resetPasswordPath(request, email, since));
  await page.getByLabel("新しいパスワード", { exact: true }).fill(password);
  await page.getByLabel("新しいパスワード（確認）").fill(password);
  await page.getByRole("button", { name: "設定する" }).click();
  await expect(page.getByText("パスワードを設定しました。")).toBeVisible();
}

// better-auth は Cookie での POST に Origin を求める
async function createOperatorWithoutPassword(
  page: Page,
  baseURL: string,
  email: string,
) {
  await login(page, seedAdmin.email, seedAdmin.password);
  await expect(page.getByTestId("operator-email")).toHaveText(seedAdmin.email);
  const response = await page.request.post("/api/auth/admin/create-user", {
    data: { email, name: email },
    headers: { Origin: baseURL },
  });
  expect(response.status()).toBe(200);
  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test("最初の管理者は、メールでパスワードを設定してログインできる", async ({
  page,
  request,
}) => {
  const password = `initial-${Date.now()}`;
  await setPasswordByMail(page, request, initialAdminEmail, password);

  await login(page, initialAdminEmail, password);
  await expect(page.getByTestId("operator-email")).toHaveText(
    initialAdminEmail,
  );
});

test("パスワード無しで作ったオペレーターは、パスワードを設定するまでログインできない", async ({
  page,
  request,
  baseURL,
}) => {
  const email = `no-password-${Date.now()}@example.com`;
  await createOperatorWithoutPassword(page, baseURL ?? "", email);

  await login(page, email, "any-password");
  await expect(
    page.getByText("メールアドレスまたはパスワードが正しくありません"),
  ).toBeVisible();

  await setPasswordByMail(page, request, email, "operator-password");
  await login(page, email, "operator-password");
  await expect(page.getByTestId("operator-email")).toHaveText(email);
});

test("パスワードを設定し直すと、ほかの端末のセッションが無効になる", async ({
  page,
  request,
  baseURL,
  browser,
  extraHTTPHeaders,
}) => {
  const email = `revoke-${Date.now()}@example.com`;
  await createOperatorWithoutPassword(page, baseURL ?? "", email);
  await setPasswordByMail(page, request, email, "first-password");

  // ほかの端末でログインしておく
  const other = await browser.newContext({ baseURL, extraHTTPHeaders });
  const otherPage = await other.newPage();
  await login(otherPage, email, "first-password");
  await expect(otherPage.getByTestId("operator-email")).toHaveText(email);

  await setPasswordByMail(page, request, email, "second-password");

  await otherPage.goto("/");
  await expect(otherPage).toHaveURL(/\/login$/);
  await other.close();
});

test("登録されていないアドレスでも同じ表示になり、メールは送られない", async ({
  page,
  request,
}) => {
  const email = `unknown-${Date.now()}@example.com`;
  await page.goto("/forgot-password");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByRole("button", { name: "メールを送る" }).click();

  await expect(
    page.getByText(
      "登録されているアドレスであれば、パスワードを設定するメールを送りました",
    ),
  ).toBeVisible();
  // 送るとしたら届いているはずの時間を待ってから、届いていないことを確かめる
  await page.waitForTimeout(2000);
  expect(await countMails(request, email)).toBe(0);
});
