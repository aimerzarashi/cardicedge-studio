import {
  login,
  seedOperator,
  setPasswordByMail,
  signUp,
  signUpAndVerify,
} from "./account";
import { expect, test } from "./fixtures";
import { countMails, verifyEmail } from "./mail";

const notVerified =
  "メールアドレスの確認が済んでいません。確認のメールを送ったので、リンクを開いてからログインしてください";

test("サインアップすると確認のメールが届き、確認するまでログインできない", async ({
  page,
  request,
}) => {
  const email = `signup-${Date.now()}@example.com`;
  const since = new Date();
  await signUp(page, email, "signup-password");

  await login(page, email, "signup-password");
  await expect(page.getByText(notVerified)).toBeVisible();

  // 確認するまでのログインで、確認のメールが送り直されている（sendOnSignIn）。最新のメールで確認する
  await verifyEmail(request, email, since);
  await login(page, email, "signup-password");
  await expect(page.getByTestId("operator-email")).toHaveText(email);
});

test("登録済みのアドレスでサインアップしても同じ表示になり、確認のメールは送られない", async ({
  page,
  request,
}) => {
  const before = await countMails(request, seedOperator.email);

  await signUp(page, seedOperator.email, "other-password");

  // 送るとしたら届いているはずの時間を待ってから、届いていないことを確かめる
  await page.waitForTimeout(2000);
  expect(await countMails(request, seedOperator.email)).toBe(before);
  await login(page, seedOperator.email, "other-password");
  await expect(
    page.getByText("メールアドレスまたはパスワードが正しくありません"),
  ).toBeVisible();
});

test("他人に先にサインアップされても、持ち主はパスワードを設定し直して確認すれば使える", async ({
  page,
  request,
}) => {
  const email = `taken-${Date.now()}@example.com`;
  // 持ち主ではない人が、持ち主のアドレスで先にサインアップする（確認のメールは持ち主に届くので確認できない）
  await signUp(page, email, "intruder-password");

  // 持ち主はサインアップできないので、パスワードを設定し直す（再設定では確認済みにならない）
  await setPasswordByMail(page, request, email, "owner-password");
  const since = new Date();
  await login(page, email, "owner-password");
  await expect(page.getByText(notVerified)).toBeVisible();
  // ログインしようとすると確認のメールが送り直される
  await verifyEmail(request, email, since);

  await login(page, email, "owner-password");
  await expect(page.getByTestId("operator-email")).toHaveText(email);
  await page.getByRole("button", { name: "ログアウト" }).click();
  await login(page, email, "intruder-password");
  await expect(
    page.getByText("メールアドレスまたはパスワードが正しくありません"),
  ).toBeVisible();
});

test("JWT に、メールアドレスと確認済みかどうかが入る", async ({
  page,
  request,
}) => {
  const email = `jwt-${Date.now()}@example.com`;
  await signUpAndVerify(page, request, email, "jwt-password");
  await login(page, email, "jwt-password");
  await expect(page.getByTestId("operator-email")).toHaveText(email);

  const response = await page.request.get("/api/auth/token");
  expect(response.status()).toBe(200);
  const { token } = await response.json();
  const payload = JSON.parse(
    Buffer.from(token.split(".")[1], "base64url").toString(),
  );

  // core は email・email_verified（OIDC の標準のクレーム名）で、初めてのログインのオペレーターを紐づける
  expect(payload).toMatchObject({ email, email_verified: true });
});

test("Admin プラグインの API は無い", async ({ page }) => {
  await login(page, seedOperator.email, seedOperator.password);
  await expect(page.getByTestId("operator-email")).toHaveText(
    seedOperator.email,
  );

  const response = await page.request.get("/api/auth/admin/list-users");

  expect(response.status()).toBe(404);
});
