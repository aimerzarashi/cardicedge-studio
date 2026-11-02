import type { Page } from "@playwright/test";
import type { TypedDocumentString } from "@/graphql/graphql";
import { expect, traceparentOf } from "./fixtures";

// 画面で作るのが重いものは、ログイン中のオペレーターの JWT で core を直接呼んで入れる。
// 公開の入口（envoy の 10000）を使うのは、中継役用の入口には core への経路が無いため
const tokens = new WeakMap<Page, string>();

async function tokenOf(page: Page): Promise<string> {
  const cached = tokens.get(page);
  if (cached) return cached;
  const response = await page.request.get("/api/auth/token");
  expect(response.status()).toBe(200);
  const { token } = await response.json();
  tokens.set(page, token);
  return token;
}

// 画面と同じ graphql() の操作（app/*/operations.ts）を受け取り、変数と結果の型をそこから付ける
export async function callCore<TResult, TVariables>(
  page: Page,
  document: TypedDocumentString<TResult, TVariables>,
  ...[variables]: TVariables extends Record<string, never> ? [] : [TVariables]
): Promise<TResult> {
  const publicURL = process.env.PLAYWRIGHT_PUBLIC_URL;
  if (!publicURL) throw new Error("PLAYWRIGHT_PUBLIC_URL が未設定です");
  const response = await fetch(`${publicURL}/studio/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      traceparent: traceparentOf(page),
      Authorization: `Bearer ${await tokenOf(page)}`,
    },
    body: JSON.stringify({ query: document.toString(), variables }),
  });
  expect(response.status).toBe(200);
  const { data } = await response.json();
  return data as TResult;
}

// core の操作の結果は id と revision だけで、詳細は投影から読む。
// 画面で次の操作をする前に、投影が操作の結果の revision に届くまで待つ（画面の Server Action の wait-*.ts と同じ考え）
export async function untilReached(
  description: string,
  reached: () => Promise<boolean>,
) {
  await expect
    .poll(reached, { message: description, timeout: 10_000 })
    .toBe(true);
}

// 成功の型でなければ、その型名を添えて落とす。通れば result をその成功の型に絞る（以降は成功の項目を型つきで読める）
export function expectSuccess<
  T extends { __typename: string },
  S extends T["__typename"],
>(result: T, success: S): asserts result is Extract<T, { __typename: S }> {
  expect(result.__typename).toBe(success);
}
