import type { APIRequestContext, Page } from "@playwright/test";
import { expect } from "./fixtures";
import { resetPasswordPath, verifyEmail } from "./mail";

// scripts/seed.ts が作る開発・テスト用のオペレーター（メールアドレスは確認済み。core の初期オペレーターと同じアドレス）
export const seedOperator = {
  email: "operator@example.com",
  password: "operator-password",
};

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();
}

export async function signUp(page: Page, email: string, password: string) {
  await page.goto("/signup");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード", { exact: true }).fill(password);
  await page.getByLabel("パスワード（確認）").fill(password);
  await page.getByRole("button", { name: "アカウントを作る" }).click();
  await expect(
    page.getByText(
      "確認のメールを送りました。メールのリンクを開いてから、ログインしてください。",
    ),
  ).toBeVisible();
}

// サインアップして確認のメールのリンクを開き、ログインできるアカウントにする
export async function signUpAndVerify(
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string,
) {
  const since = new Date();
  await signUp(page, email, password);
  await verifyEmail(request, email, since);
}

// 「パスワードを忘れた」からメールを送り、届いたリンクで新しいパスワードを設定する
export async function setPasswordByMail(
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string,
) {
  const since = new Date();
  await page.goto("/login");
  await page.getByRole("link", { name: "パスワードを忘れた" }).click();
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
