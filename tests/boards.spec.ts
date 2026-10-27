import type { Page } from "@playwright/test";
import { publishableLayout, registerBoard, setBoardLayout } from "./board";
import { loginAsOperator, uniqueName } from "./card";
import { expect, test } from "./fixtures";
import { section } from "./preset-deck";

function boardRows(page: Page) {
  return page.locator("tbody tr");
}

// 詳細の「用語 → 説明」の説明を返す
function detail(page: Page, term: string) {
  return page
    .locator("dt", { hasText: new RegExp(`^${term}$`) })
    .locator("xpath=following-sibling::dd[1]");
}

test("登録すると詳細の画面に移り、一覧に準備中・8×8 で出る。マスは 0", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("草原");

  await registerBoard(page, name);

  await expect(page).toHaveURL(/\/boards\/[0-9a-f-]{36}$/);
  await expect(detail(page, "状態")).toHaveText("準備中");
  await expect(detail(page, "大きさ")).toHaveText("8×8");
  await expect(detail(page, "マス")).toHaveText("0");
  await expect(detail(page, "つながり")).toHaveText("0");
  await expect(async () => {
    await page.goto(`/boards?name=${encodeURIComponent(name)}`);
    await expect(boardRows(page)).toHaveCount(1, { timeout: 1_000 });
  }).toPass();
  await expect(boardRows(page).first()).toContainText(name);
  await expect(boardRows(page).first()).toContainText("準備中");
  await expect(boardRows(page).first()).toContainText("8×8");
});

test("使われている名前で登録すると名前の重複が表示され、入力した値が残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("砂漠");
  await registerBoard(page, name);

  await page.goto("/boards/new");
  await page.getByLabel("名前").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();

  await expect(page.getByText("この名前はすでに使われています")).toBeVisible();
  await expect(page.getByLabel("名前")).toHaveValue(name);
});

test("空白だけの名前で登録すると、名前の入力を促す誤りが出る", async ({
  page,
}) => {
  await loginAsOperator(page);

  await page.goto("/boards/new");
  await page.getByLabel("名前").fill("   ");
  await page.getByRole("button", { name: "登録する" }).click();

  await expect(page.getByText("名前を入力してください")).toBeVisible();
});

test("名前を変えると詳細の見出しと入力欄が新しい名前になる", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("草原"));
  const renamed = uniqueName("高原");

  const rename = section(page, "名前の変更");
  await rename.getByLabel("名前").fill(renamed);
  await rename.getByRole("button", { name: "名前を変える" }).click();

  await expect(rename.getByText("名前を変えました")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(renamed);
  await expect(rename.getByLabel("名前")).toHaveValue(renamed);
});

test("使われている名前に変えようとすると名前の重複が表示される", async ({
  page,
}) => {
  await loginAsOperator(page);
  const taken = uniqueName("砂漠");
  await registerBoard(page, taken);
  await registerBoard(page, uniqueName("草原"));

  const rename = section(page, "名前の変更");
  await rename.getByLabel("名前").fill(taken);
  await rename.getByRole("button", { name: "名前を変える" }).click();

  await expect(
    rename.getByText("この名前はすでに使われています"),
  ).toBeVisible();
  await expect(rename.getByLabel("名前")).toHaveValue(taken);
});

test("空のボードを公開しようとすると、拠点とチェックポイントの誤りが出て準備中のまま", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("作りかけ"));

  const publish = section(page, "公開");
  await publish.getByRole("button", { name: "公開する" }).click();

  // 「ちょうど 1 つ」「1 つ以上」は公開の条件そのもので、数は core が返したものを表示する
  await expect(
    publish.getByText("拠点が 0 個です。ちょうど 1 つ置いてください"),
  ).toBeVisible();
  await expect(
    publish.getByText("チェックポイントがありません。1 つ以上置いてください"),
  ).toBeVisible();
  await expect(detail(page, "状態")).toHaveText("準備中");
});

test("拠点から行けないマスがあるボードを公開しようとすると、その座標が出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("離れ小島"));
  await setBoardLayout(page, {
    width: 8,
    height: 8,
    tiles: [
      { x: 0, y: 0, kind: "BASE" },
      { x: 1, y: 0, kind: "CHECKPOINT" },
      { x: 2, y: 3, kind: "LAND" },
      { x: 4, y: 5, kind: "LAND" },
    ],
    connections: [{ a: { x: 0, y: 0 }, b: { x: 1, y: 0 } }],
  });
  await expect(detail(page, "マス")).toHaveText("4");

  const publish = section(page, "公開");
  await publish.getByRole("button", { name: "公開する" }).click();

  await expect(
    publish.getByText("拠点から行けないマスがあります: (2, 3)・(4, 5)"),
  ).toBeVisible();
  await expect(detail(page, "状態")).toHaveText("準備中");
});

test("レイアウトを入れると、マスの数とつながりの数が詳細に出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("一本道"));

  await setBoardLayout(page, publishableLayout);

  await expect(detail(page, "大きさ")).toHaveText("3×1");
  await expect(detail(page, "マス")).toHaveText("3");
  await expect(detail(page, "つながり")).toHaveText("2");
});

test("公開すると変更と削除ができなくなり、使用不可にすると公開し直せる", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("一本道"));
  await setBoardLayout(page, publishableLayout);

  const publish = section(page, "公開");
  await publish.getByRole("button", { name: "公開する" }).click();
  await expect(publish.getByText("公開しました")).toBeVisible();
  await expect(detail(page, "状態")).toHaveText("公開中");
  await expect(section(page, "名前の変更")).toHaveCount(0);
  await expect(section(page, "削除")).toHaveCount(0);

  await publish.getByRole("button", { name: "使用不可にする" }).click();
  await expect(publish.getByText("使用不可にしました")).toBeVisible();
  await expect(detail(page, "状態")).toHaveText("使用不可");
  await expect(section(page, "名前の変更")).toHaveCount(0);
  await expect(section(page, "削除")).toHaveCount(0);

  await publish.getByRole("button", { name: "公開する" }).click();
  await expect(detail(page, "状態")).toHaveText("公開中");
});

test("状態で絞り込むと、その状態のボードだけが出る", async ({ page }) => {
  await loginAsOperator(page);
  const name = uniqueName("草原");
  await registerBoard(page, name);
  await expect(async () => {
    await page.goto(`/boards?name=${encodeURIComponent(name)}`);
    await expect(boardRows(page)).toHaveCount(1, { timeout: 1_000 });
  }).toPass();

  await page.getByLabel("公開中").check();
  await page.getByRole("button", { name: "絞り込む" }).click();
  await expect(page).toHaveURL(/status=PUBLISHED/);
  await expect(page.getByText("ボードがありません")).toBeVisible();

  await page.getByLabel("公開中").uncheck();
  await page.getByLabel("準備中").check();
  await page.getByRole("button", { name: "絞り込む" }).click();
  await expect(page).toHaveURL(/status=DRAFT/);
  await expect(boardRows(page)).toHaveCount(1);
  await expect(boardRows(page).first()).toContainText(name);
});

test("削除を確かめてから削除すると一覧の画面に移り、詳細は見つからなくなる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("砂漠");
  await registerBoard(page, name);
  const boardURL = new URL(page.url()).pathname;

  const del = section(page, "削除");
  await del.getByRole("button", { name: "削除する" }).click();
  await expect(
    del.getByText(`「${name}」を削除します。よろしいですか？`),
  ).toBeVisible();
  await del.getByRole("button", { name: "削除する" }).click();

  await expect(page).toHaveURL(/\/boards$/);
  await expect(async () => {
    await page.goto(boardURL);
    await expect(page.getByText("このボードは見つかりません")).toBeVisible({
      timeout: 1_000,
    });
  }).toPass();
});

test("ほかの画面で先に公開されていると、名前は変わらず、最新の状態に切り替わって変更の欄が無くなる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("一本道");
  await registerBoard(page, name);
  await setBoardLayout(page, publishableLayout);
  const other = await page.context().newPage();
  await other.goto(page.url());
  await expect(other.getByRole("heading", { level: 1 })).toHaveText(name);
  const publish = section(page, "公開");
  await publish.getByRole("button", { name: "公開する" }).click();
  await expect(publish.getByText("公開しました")).toBeVisible();

  const stale = section(other, "名前の変更");
  await stale.getByLabel("名前").fill(uniqueName("高原"));
  await stale.getByRole("button", { name: "名前を変える" }).click();

  // 公開すると revision が進むため、先に変えられたことになり、出し直した画面は公開中のものになる
  await expect(detail(other, "状態")).toHaveText("公開中");
  await expect(stale).toHaveCount(0);
  await expect(other.getByRole("heading", { level: 1 })).toHaveText(name);
});
