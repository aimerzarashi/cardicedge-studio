import type { Page } from "@playwright/test";
import {
  boardRevisionQuery,
  changeBoardLayoutMutation,
} from "@/app/boards/operations";
import type {
  BoardConnectionInput,
  BoardTileInput,
  BoardTilePairInput,
} from "@/graphql/graphql";
import { callCore, expectSuccess } from "./core";
import { expect } from "./fixtures";
import { section } from "./preset-deck";

// 登録すると、詳細に反映されてから詳細の画面に移る
export async function registerBoard(page: Page, name: string) {
  await page.goto("/boards/new");
  await page.getByLabel("名前").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
}

export type Attribute = "火" | "地" | "水" | "風" | "無" | "複";
export type Tool =
  | `${Attribute}属性の土地`
  | "拠点"
  | "チェックポイント"
  | "転送円"
  | "橋"
  | "聖堂"
  | "ほこら"
  | "占い館"
  | "カード屋"
  | "消す";
// core の入力（@oneOf。種類ごとに 1 つだけ書く）の型は、codegen の生成物をそのまま使う
export type Tile = BoardTileInput;
export type Connection = BoardConnectionInput;
export type Pair = BoardTilePairInput;

// 詳細の画面にいるボードのレイアウトを入れる（準備中のものだけ入れられる）
export async function setBoardLayout(
  page: Page,
  layout: {
    width: number;
    height: number;
    tiles: Tile[];
    connections: Connection[];
    // 無ければ空（core は必須なので、送るときに足す）
    pairs?: Pair[];
  },
) {
  const id = new URL(page.url()).pathname.split("/").pop();
  if (!id) throw new Error("ボードの詳細の URL ではありません");
  const read = await callCore(page, boardRevisionQuery, { id });
  expectSuccess(read.board, "Board");
  const changed = await callCore(page, changeBoardLayoutMutation, {
    input: { id, revision: read.board.revision, pairs: [], ...layout },
  });
  expectSuccess(changed.changeBoardLayout, "ChangeBoardLayoutSuccess");
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

function layout(page: Page) {
  return section(page, "レイアウト");
}

export function tileButton(page: Page, x: number, y: number) {
  // 置いてあるマスの名前は、種類が付く（「(2, 0) のマス 拠点」。土地は「(1, 0) のマス 火属性の土地」）
  return layout(page).getByRole("button", {
    name: new RegExp(`^\\(${x}, ${y}\\) のマス`),
  });
}

export function connectionButton(
  page: Page,
  a: [number, number],
  b: [number, number],
) {
  return layout(page).getByRole("button", {
    name: `(${a[0]}, ${a[1]}) と (${b[0]}, ${b[1]}) のつながり`,
    exact: true,
  });
}

// 道具を選んで、マスを順に押す
export async function putTiles(
  page: Page,
  tool: Tool,
  positions: [number, number][],
) {
  await layout(page).getByLabel(tool, { exact: true }).check();
  for (const [x, y] of positions) {
    await tileButton(page, x, y).click();
  }
}

export async function saveLayout(page: Page) {
  const editor = layout(page);
  await editor.getByRole("button", { name: "レイアウトを保存" }).click();
  await expect(editor.getByText("レイアウトを保存しました")).toBeVisible();
}

// 拠点 1 つ・チェックポイント 1 つが、土地を通ってつながった横一列のレイアウト（公開できる）を画面で作って保存する
export async function savePublishableLayout(page: Page) {
  await putTiles(page, "拠点", [[0, 0]]);
  await putTiles(page, "火属性の土地", [[1, 0]]);
  await putTiles(page, "チェックポイント", [[2, 0]]);
  await saveLayout(page);
}
