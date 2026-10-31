import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";
import { test as base } from "@playwright/test";

// better-auth のレート制限（本番モードで有効。ログインは同じ IP から 10 秒に 3 回まで）は IP ごとに数える。
// ブラウザはすべて studio-playwright コンテナから送るため、テストごとに X-Forwarded-For で別の IP を名乗り、
// ほかのテストのログインと同じ枠で数えられないようにする（198.18.0.0/15 は検証用のアドレス範囲）。
// 名乗った IP が使われるのは、テスト用の環境だけにある中継役用の入口（local/envoy/relay-listener.yaml）を通るとき。
// 公開の入口では X-Forwarded-For は信じない（studio#10）
function ipFor(testId: string, retry: number) {
  let hash = retry;
  for (const char of testId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `198.${18 + (hash & 1)}.${(hash >>> 1) & 255}.${(hash >>> 9) & 255}`;
}

// テストごとに W3C の traceparent を作り、ブラウザの通信と core を直接呼ぶ前準備（tests/core.ts）の両方に付ける。
// studio・core が受けたトレースを引き継ぐため、落ちたテストの一連の処理を 1 つの trace id で引ける（studio#51）。
// page.route() で付けないのは、X-Forwarded-For と同じ extraHTTPHeaders の置き方のほうが書く量が少なく、効き目も同じため
const traceparents = new WeakMap<Page, string>();

export function traceparentOf(page: Page): string {
  const traceparent = traceparents.get(page);
  if (!traceparent)
    throw new Error("tests/fixtures.ts の test を使ってください");
  return traceparent;
}

export const test = base.extend<{ traceparent: string }>({
  traceparent: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright は第 1 引数を分割代入の形で読んで依存を決めるため、使わなくても外せない
    async ({}, use, testInfo) => {
      const traceId = randomBytes(16).toString("hex");
      const traceparent = `00-${traceId}-${randomBytes(8).toString("hex")}-01`;
      // 通ったテストにも付けるのは、通ったが遅かったテストも受け手で調べられるため
      testInfo.annotations.push({ type: "trace id", description: traceId });
      await use(traceparent);
      // 落ちたテストの出力先に trace id を残す。make test が落ちたとき、scripts/save-test-failure.sh がこれを頼りに
      // 受け手（Tempo・Loki）からそのテストのトレースとログを取り出す
      if (testInfo.status !== testInfo.expectedStatus) {
        mkdirSync(testInfo.outputDir, { recursive: true });
        writeFileSync(join(testInfo.outputDir, "trace-id.txt"), `${traceId}\n`);
      }
    },
    { scope: "test" },
  ],
  extraHTTPHeaders: async (
    { extraHTTPHeaders, traceparent },
    use,
    testInfo,
  ) => {
    await use({
      ...extraHTTPHeaders,
      "X-Forwarded-For": ipFor(testInfo.testId, testInfo.retry),
      traceparent,
    });
  },
  page: async ({ page, traceparent }, use) => {
    traceparents.set(page, traceparent);
    await use(page);
  },
});

export { expect } from "@playwright/test";
