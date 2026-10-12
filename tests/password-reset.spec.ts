import { login, setPasswordByMail, signUpAndVerify } from "./account";
import { expect, test } from "./fixtures";
import { countMails } from "./mail";

test("パスワードを設定し直すと、新しいパスワードでログインでき、ほかの端末のセッションが無効になる", async ({
  page,
  request,
  baseURL,
  browser,
  extraHTTPHeaders,
}) => {
  const email = `revoke-${Date.now()}@example.com`;
  await signUpAndVerify(page, request, email, "first-password");

  // ほかの端末でログインしておく
  const other = await browser.newContext({ baseURL, extraHTTPHeaders });
  const otherPage = await other.newPage();
  await login(otherPage, email, "first-password");
  await expect(otherPage.getByTestId("operator-email")).toHaveText(email);

  await setPasswordByMail(page, request, email, "second-password");

  await otherPage.goto("/");
  await expect(otherPage).toHaveURL(/\/login$/);
  await other.close();
  await login(page, email, "second-password");
  await expect(page.getByTestId("operator-email")).toHaveText(email);
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
