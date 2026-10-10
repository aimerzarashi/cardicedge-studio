import { test as base } from "@playwright/test";

// better-auth のレート制限（本番モードで有効。ログインは同じ IP から 10 秒に 3 回まで）は IP ごとに数える。
// ブラウザはすべて cms-playwright コンテナから送るため、テストごとに X-Forwarded-For で別の IP を名乗り、
// ほかのテストのログインと同じ枠で数えられないようにする（198.18.0.0/15 は検証用のアドレス範囲）。
// cms#10 で X-Forwarded-For を信じる相手を絞った後は、テスト用の環境で cms-playwright を信頼できるプロキシにする
function ipFor(testId: string, retry: number) {
  let hash = retry;
  for (const char of testId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `198.${18 + (hash & 1)}.${(hash >>> 1) & 255}.${(hash >>> 9) & 255}`;
}

export const test = base.extend({
  extraHTTPHeaders: async ({ extraHTTPHeaders }, use, testInfo) => {
    await use({
      ...extraHTTPHeaders,
      "X-Forwarded-For": ipFor(testInfo.testId, testInfo.retry),
    });
  },
});

export { expect } from "@playwright/test";
