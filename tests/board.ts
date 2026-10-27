import type { Page } from "@playwright/test";
import { expect } from "./fixtures";

// 登録すると、詳細に反映されてから詳細の画面に移る
export async function registerBoard(page: Page, name: string) {
  await page.goto("/boards/new");
  await page.getByLabel("名前").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
}

export type Tile = {
  x: number;
  y: number;
  kind: "LAND" | "BASE" | "CHECKPOINT";
};
export type Connection = {
  a: { x: number; y: number };
  b: { x: number; y: number };
};

// 拠点 1 つ・チェックポイント 1 つが、土地を通ってつながった 3×1 のレイアウト（公開できる）
export const publishableLayout = {
  width: 3,
  height: 1,
  tiles: [
    { x: 0, y: 0, kind: "BASE" },
    { x: 1, y: 0, kind: "LAND" },
    { x: 2, y: 0, kind: "CHECKPOINT" },
  ] satisfies Tile[],
  connections: [
    { a: { x: 0, y: 0 }, b: { x: 1, y: 0 } },
    { a: { x: 1, y: 0 }, b: { x: 2, y: 0 } },
  ] satisfies Connection[],
};

// レイアウトの編集の画面は studio#32 で作るため、それまでの間は、ログイン中のオペレーターの JWT で core を直接呼んで入れる。
// 公開の入口（envoy の 10000）を使うのは、中継役用の入口には core への経路が無いため
async function callCore(
  page: Page,
  query: string,
  variables: Record<string, unknown>,
) {
  const publicURL = process.env.PLAYWRIGHT_PUBLIC_URL;
  if (!publicURL) throw new Error("PLAYWRIGHT_PUBLIC_URL が未設定です");
  const tokenResponse = await page.request.get("/api/auth/token");
  expect(tokenResponse.status()).toBe(200);
  const { token } = await tokenResponse.json();
  const response = await fetch(`${publicURL}/studio/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  expect(response.status).toBe(200);
  const { data } = await response.json();
  return data;
}

// 詳細の画面にいるボードのレイアウトを入れる（準備中のものだけ入れられる）
export async function setBoardLayout(
  page: Page,
  layout: {
    width: number;
    height: number;
    tiles: Tile[];
    connections: Connection[];
  },
) {
  const id = new URL(page.url()).pathname.split("/").pop();
  const read = await callCore(
    page,
    "query($id: UUID!) { board(id: $id) { __typename ... on Board { revision } } }",
    { id },
  );
  expect(read.board.__typename).toBe("Board");
  const changed = await callCore(
    page,
    `mutation($input: ChangeBoardLayoutInput!) {
      changeBoardLayout(input: $input) { __typename }
    }`,
    { input: { id, revision: read.board.revision, ...layout } },
  );
  expect(changed.changeBoardLayout.__typename).toBe("ChangeBoardLayoutSuccess");
  // 詳細は投影から読むため、入れたレイアウトが出るまで開き直す
  await expect(async () => {
    await page.reload();
    await expect(
      page.getByRole("term").filter({ hasText: "大きさ" }),
    ).toBeVisible({
      timeout: 1_000,
    });
    await expect(
      page.getByText(`${layout.width}×${layout.height}`, { exact: true }),
    ).toBeVisible({ timeout: 1_000 });
  }).toPass();
}
