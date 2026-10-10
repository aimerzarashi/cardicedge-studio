import { type APIRequestContext, expect } from "@playwright/test";

// 送ったメールは Mailpit が受け止める。テストは Mailpit の API で読む
const mailpit = process.env.PLAYWRIGHT_MAILPIT_URL;

type MailpitMessage = { ID: string; Created: string };

async function searchMails(request: APIRequestContext, to: string) {
  if (!mailpit) throw new Error("PLAYWRIGHT_MAILPIT_URL が未設定です");
  const response = await request.get(`${mailpit}/api/v1/search`, {
    params: { query: `to:"${to}"` },
  });
  expect(response.ok()).toBe(true);
  return ((await response.json()).messages ?? []) as MailpitMessage[];
}

// URL のホスト名は BETTER_AUTH_URL（開発用の環境では localhost:3001）で、ブラウザのコンテナからは届かないため、
// パスとクエリだけを使う
function pathOf(url: URL) {
  return `${url.pathname}${url.search}`;
}

// since より後に届いた、その宛先の最新のメールのリンクを開いた先（パスワードの設定画面。?token=... 付き）のパスを返す。
// リンクは better-auth の /api/auth/reset-password/:token で、トークンを確かめてから設定画面へ転送する
export async function resetPasswordPath(
  request: APIRequestContext,
  to: string,
  since: Date,
) {
  let id: string | undefined;
  await expect
    .poll(async () => {
      const latest = (await searchMails(request, to)).find(
        (message) => new Date(message.Created) > since,
      );
      id = latest?.ID;
      return id;
    })
    .toBeTruthy();
  const response = await request.get(`${mailpit}/api/v1/message/${id}`);
  const text: string = (await response.json()).Text;
  const link = text.match(/https?:\/\/\S+\/reset-password\/\S+/)?.[0];
  if (!link) throw new Error(`パスワードの設定のリンクがありません: ${text}`);

  const redirect = await request.get(pathOf(new URL(link)), {
    maxRedirects: 0,
  });
  const location = redirect.headers().location;
  if (!location) throw new Error(`転送されませんでした: ${redirect.status()}`);
  return pathOf(new URL(location, link));
}

export async function countMails(request: APIRequestContext, to: string) {
  return (await searchMails(request, to)).length;
}
