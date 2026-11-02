import type { Page } from "@playwright/test";
import {
  connectionButton,
  putTiles,
  registerBoard,
  saveLayout,
  savePublishableLayout,
  setBoardLayout,
  tileButton,
} from "./board";
import { loginAsOperator, uniqueName } from "./card";
import { expect, test } from "./fixtures";
import { section } from "./preset-deck";

function boardRows(page: Page) {
  // 1 つのボードは tbody 1 つ（2 行）
  return page.locator("tbody");
}

// マスの中心と、格子の枠の中心の距離（px）
async function centerOffset(page: Page, x: number, y: number) {
  const tile = await tileButton(page, x, y).boundingBox();
  const frame = await page.locator("[data-scale]").boundingBox();
  if (!tile || !frame) throw new Error("位置が取れません");
  return Math.hypot(
    tile.x + tile.width / 2 - (frame.x + frame.width / 2),
    tile.y + tile.height / 2 - (frame.y + frame.height / 2),
  );
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

// 公開できない理由の一覧（レイアウトの節。保存したレイアウトを core が判定したもの）
function problemList(page: Page) {
  return section(page, "レイアウト").getByRole("list", {
    name: "公開できない理由",
  });
}

// 座標のある理由を試すための、拠点から行けないマスが 2 つあるレイアウト
const unreachableLayout: Parameters<typeof setBoardLayout>[1] = {
  width: 8,
  height: 8,
  tiles: [
    { base: { x: 0, y: 0 } },
    { checkpoint: { x: 1, y: 0 } },
    { land: { x: 2, y: 3, attribute: "FIRE" } },
    { land: { x: 4, y: 5, attribute: "FIRE" } },
  ],
  connections: [{ a: { x: 0, y: 0 }, b: { x: 1, y: 0 } }],
};

test("拠点が 2 つのレイアウトでは、数が一覧に出て、2 つの拠点に印が付き、項目を押すと拠点へ動いて目立つ", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("二つの拠点"));
  await setBoardLayout(page, {
    width: 8,
    height: 8,
    tiles: [
      { base: { x: 0, y: 0 } },
      { base: { x: 7, y: 7 } },
      { checkpoint: { x: 1, y: 0 } },
    ],
    connections: [],
  });

  const item = problemList(page).getByRole("button", {
    name: "拠点が 2 つあります。ちょうど 1 つにしてください",
  });
  await expect(item).toBeVisible();
  await expect(tileButton(page, 0, 0)).toHaveAttribute("data-mark", "base");
  await expect(tileButton(page, 7, 7)).toHaveAttribute("data-mark", "base");
  await expect(tileButton(page, 1, 0)).not.toHaveAttribute("data-mark");
  await expect(tileButton(page, 7, 7)).not.toHaveAttribute("data-focused");

  await item.click();

  // 先頭の拠点が枠の中央へ動き、座標の全部が目立つ
  await expect(tileButton(page, 0, 0)).toHaveAttribute("data-focused", "true");
  await expect(tileButton(page, 7, 7)).toHaveAttribute("data-focused", "true");
  await expect
    .poll(() => centerOffset(page, 0, 0), { message: "枠の中央に動く" })
    .toBeLessThan(3);
});

test("拠点を 2 つ置くと保存せずに数が一覧に出て、つながりを切ると行けないマスが一覧と印に出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("置きながら確かめる"));
  await savePublishableLayout(page);
  await expect(
    section(page, "レイアウト").getByText("公開できます", { exact: true }),
  ).toBeVisible();

  // 拠点をもう 1 つ置く
  await putTiles(page, "拠点", [[3, 0]]);
  await expect(
    problemList(page).getByRole("button", {
      name: "拠点が 2 つあります。ちょうど 1 つにしてください",
    }),
  ).toBeVisible();
  await expect(tileButton(page, 3, 0)).toHaveAttribute("data-mark", "base");

  // 消すと「公開できます」に戻る
  await putTiles(page, "消す", [[3, 0]]);
  await expect(
    section(page, "レイアウト").getByText("公開できます", { exact: true }),
  ).toBeVisible();

  // つながりを切ると、チェックポイントに行けなくなる
  await connectionButton(page, [1, 0], [2, 0]).click();
  await expect(
    problemList(page).getByText("拠点から行けないマスが 1 つあります"),
  ).toBeVisible();
  await expect(tileButton(page, 2, 0)).toHaveAttribute(
    "data-mark",
    "unreachable",
  );
});

test("公開しようとして理由が残っていると、公開の節にも同じ一覧が出て準備中のまま", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("公開の失敗"));
  await setBoardLayout(page, unreachableLayout);

  const publish = section(page, "公開");
  await publish.getByRole("button", { name: "公開する" }).click();

  const list = publish.getByRole("list", { name: "公開できない理由" });
  await expect(
    list.getByText("拠点から行けないマスが 2 つあります"),
  ).toBeVisible();
  // 公開の節の一覧は文言だけで、座標の文字の羅列は出さない
  await expect(list.getByRole("button")).toHaveCount(0);
  await expect(list).not.toContainText("(2, 3)");
  await expect(detail(page, "状態")).toHaveText("準備中");
});

test("画面でマスを置いて間の印でつながりを切る・つなぐと、保存した数が詳細に出て、公開できる", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("一本道"));

  // 空のボードの理由には座標が無いので、押せる項目も印も無い。マスの無い側の間の印は押せない
  const list = problemList(page);
  await expect(
    list.getByText("拠点がありません。ちょうど 1 つ置いてください"),
  ).toBeVisible();
  await expect(list.getByRole("button")).toHaveCount(0);
  await expect(page.locator("[data-mark]")).toHaveCount(0);
  await expect(connectionButton(page, [0, 0], [1, 0])).toBeDisabled();

  await putTiles(page, "拠点", [[0, 0]]);
  await putTiles(page, "火属性の土地", [[1, 0]]);
  await putTiles(page, "チェックポイント", [[2, 0]]);

  // 置いたマスは隣とつながる
  await expect(tileButton(page, 1, 0)).toHaveAccessibleName(
    "(1, 0) のマス 火属性の土地",
  );
  const between = connectionButton(page, [0, 0], [1, 0]);
  await expect(between).toHaveAttribute("aria-pressed", "true");
  await expect(connectionButton(page, [1, 0], [2, 0])).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await between.click();
  await expect(between).toHaveAttribute("aria-pressed", "false");
  await saveLayout(page);
  await expect(detail(page, "マス")).toHaveText("3");
  await expect(detail(page, "つながり")).toHaveText("1");

  await between.click();
  await expect(between).toHaveAttribute("aria-pressed", "true");
  await saveLayout(page);
  await expect(detail(page, "つながり")).toHaveText("2");

  const publish = section(page, "公開");
  await publish.getByRole("button", { name: "公開する" }).click();
  await expect(publish.getByText("公開しました")).toBeVisible();
  await expect(detail(page, "状態")).toHaveText("公開中");
});

test("属性ごとの土地・施設 4 つ・転送円と橋の対を置いて保存すると、詳細を開き直しても、種類・属性・番号ごと出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("全部の種類"));

  const attributes = ["火", "地", "水", "風", "無", "複"] as const;
  for (const [x, attribute] of attributes.entries()) {
    await putTiles(page, `${attribute}属性の土地`, [[x, 0]]);
  }
  await putTiles(page, "拠点", [[0, 1]]);
  await putTiles(page, "チェックポイント", [[1, 1]]);
  const facilities = [
    ["聖堂", "聖"],
    ["ほこら", "祠"],
    ["占い館", "占"],
    ["カード屋", "店"],
  ] as const;
  for (const [x, [tool]] of facilities.entries()) {
    await putTiles(page, tool, [[x, 2]]);
  }
  // 1 つ目は相手待ちで、相手のいない印の「?」が出る
  await putTiles(page, "転送円", [[0, 4]]);
  await expect(tileButton(page, 0, 4)).toHaveAccessibleName(
    /^\(0, 4\) のマス 転送円 相手なし（相手待ち）/,
  );
  await expect(tileButton(page, 0, 4)).toHaveText("?");
  await putTiles(page, "転送円", [[3, 4]]);
  await putTiles(page, "橋", [
    [0, 6],
    [3, 6],
  ]);
  await saveLayout(page);
  await page.reload();

  for (const [x, attribute] of attributes.entries()) {
    await expect(tileButton(page, x, 0)).toHaveAccessibleName(
      `(${x}, 0) のマス ${attribute}属性の土地`,
    );
  }
  await expect(tileButton(page, 0, 1)).toHaveAccessibleName(
    "(0, 1) のマス 拠点",
  );
  await expect(tileButton(page, 1, 1)).toHaveAccessibleName(
    "(1, 1) のマス チェックポイント",
  );
  for (const [x, [tool, glyph]] of facilities.entries()) {
    await expect(tileButton(page, x, 2)).toHaveAccessibleName(
      `(${x}, 2) のマス ${tool}`,
    );
    await expect(tileButton(page, x, 2)).toHaveText(glyph);
  }
  // 行けないマスの印の説明が末尾に付くので、番号までを確かめる
  await expect(tileButton(page, 0, 4)).toHaveAccessibleName(
    /^\(0, 4\) のマス 転送円 1-1/,
  );
  await expect(tileButton(page, 3, 4)).toHaveAccessibleName(
    /^\(3, 4\) のマス 転送円 1-2/,
  );
  await expect(tileButton(page, 0, 4)).toHaveText("1-1");
  await expect(tileButton(page, 3, 6)).toHaveAccessibleName(
    /^\(3, 6\) のマス 橋 1-2/,
  );
  await expect(section(page, "レイアウト").getByLabel("凡例")).toHaveText(
    "拠点チェックポイント火属性の土地地属性の土地水属性の土地風属性の土地無属性の土地複属性の土地転送円橋聖堂ほこら占い館カード屋",
  );
});

test("公開中は、格子も既定のルールも表示だけで出て、編集の操作と入力欄は出ない", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("一本道"));
  await savePublishableLayout(page);
  const publish = section(page, "公開");
  await publish.getByRole("button", { name: "公開する" }).click();
  await expect(detail(page, "状態")).toHaveText("公開中");

  const editor = section(page, "レイアウト");
  await expect(tileButton(page, 1, 0)).toHaveAccessibleName(
    "(1, 0) のマス 火属性の土地",
  );
  await expect(tileButton(page, 1, 0)).toBeDisabled();
  await expect(connectionButton(page, [0, 0], [1, 0])).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(editor.getByLabel("火属性の土地", { exact: true })).toHaveCount(
    0,
  );
  await expect(editor.getByLabel("幅")).toHaveCount(0);
  await expect(
    editor.getByRole("button", { name: "レイアウトを保存" }),
  ).toHaveCount(0);

  const rules = section(page, "既定のルール");
  await expect(detail(page, "目標の魔力")).toHaveText("8000");
  await expect(detail(page, "開始時の魔力")).toHaveText("600");
  await expect(detail(page, "周回のボーナス")).toHaveText("300");
  await expect(detail(page, "チェックポイントのボーナス")).toHaveText("100");
  await expect(detail(page, "ラウンドの上限")).toHaveText("30");
  await expect(detail(page, "サイコロの目（最小）")).toHaveText("1");
  await expect(detail(page, "サイコロの目（最大）")).toHaveText("6");
  await expect(rules.getByLabel("目標の魔力")).toHaveCount(0);
  await expect(rules.getByRole("button", { name: "ルールを保存" })).toHaveCount(
    0,
  );
});

test("置いてあるマスより幅を小さくした値では保存できず、マスを消すと入力した幅になる", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("狭い"));
  await putTiles(page, "火属性の土地", [[5, 0]]);

  const editor = section(page, "レイアウト");
  const width = editor.getByLabel("幅");
  await expect(width).toHaveAttribute("min", "6");
  await width.fill("3");
  await editor.getByRole("button", { name: "レイアウトを保存" }).click();

  // 入力の下限でブラウザが送信を止める
  expect(
    await width.evaluate((input: HTMLInputElement) => input.validity.valid),
  ).toBe(false);
  await expect(editor.getByText("レイアウトを保存しました")).toHaveCount(0);
  await expect(tileButton(page, 5, 0)).toHaveAccessibleName(
    "(5, 0) のマス 火属性の土地",
  );

  // 入力欄に残っている 3 に、格子が合う
  await putTiles(page, "消す", [[5, 0]]);
  await expect(tileButton(page, 3, 0)).toHaveCount(0);
  await expect(tileButton(page, 2, 0)).toBeVisible();
});

test("公開すると変更と削除ができなくなり、使用不可にすると公開し直せる", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("一本道"));
  await savePublishableLayout(page);

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
  await savePublishableLayout(page);
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

function viewport(page: Page) {
  return section(page, "レイアウト").locator("[data-scale]");
}

async function scaleOf(page: Page) {
  return Number(await viewport(page).getAttribute("data-scale"));
}

test("格子をドラッグしてもマスは置かれない", async ({ page }) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("ドラッグ"));
  const box = await tileButton(page, 3, 3).boundingBox();
  if (!box) throw new Error("マスの位置が取れません");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40, y + 10, { steps: 5 });
  await page.mouse.up();

  await expect(tileButton(page, 3, 3)).toHaveAccessibleName("(3, 3) のマス");
  await expect(detail(page, "マス")).toHaveText("0");
  await expect(
    section(page, "レイアウト").getByRole("button", {
      name: /のマス 火属性の土地/,
    }),
  ).toHaveCount(0);
});

test("拡大・縮小・全体を表示のボタンで、表示の倍率が変わる", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("倍率"));
  const editor = section(page, "レイアウト");
  await expect(viewport(page)).toHaveAttribute("data-scale", /.+/);
  const fitted = await scaleOf(page);

  await editor.getByRole("button", { name: "拡大" }).click();
  expect(await scaleOf(page)).toBeGreaterThan(fitted);
  await editor.getByRole("button", { name: "縮小" }).click();
  await editor.getByRole("button", { name: "縮小" }).click();
  expect(await scaleOf(page)).toBeLessThan(fitted);
  await editor.getByRole("button", { name: "全体を表示" }).click();
  expect(await scaleOf(page)).toBeCloseTo(fitted, 3);
});

test("幅・高さが最大のボードでも、端のマスを押せる", async ({ page }) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("広い"));
  const editor = section(page, "レイアウト");
  const max = await editor.getByLabel("幅").getAttribute("max");
  await editor.getByLabel("幅").fill(String(max));
  await editor.getByLabel("高さ").fill(String(max));
  const last = Number(max) - 1;

  await putTiles(page, "拠点", [[last, last]]);

  await expect(tileButton(page, last, last)).toHaveAccessibleName(
    `(${last}, ${last}) のマス 拠点`,
  );
});

test("準備中のボードの既定のルールを変えて保存すると、開き直しても変えた値が出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("ルール"));
  const rules = section(page, "既定のルール");
  await expect(rules.getByLabel("目標の魔力")).toHaveValue("8000");

  await rules.getByLabel("目標の魔力").fill("12000");
  await rules.getByLabel("開始時の魔力").fill("0");
  await rules.getByLabel("周回のボーナス").fill("500");
  await rules.getByLabel("チェックポイントのボーナス").fill("100");
  await rules.getByLabel("ラウンドの上限").fill("20");
  await rules.getByLabel("サイコロの目（最小）").fill("2");
  await rules.getByLabel("サイコロの目（最大）").fill("12");
  await rules.getByRole("button", { name: "ルールを保存" }).click();

  await expect(rules.getByText("ルールを保存しました")).toBeVisible();
  await page.reload();
  await expect(rules.getByLabel("目標の魔力")).toHaveValue("12000");
  await expect(rules.getByLabel("開始時の魔力")).toHaveValue("0");
  await expect(rules.getByLabel("周回のボーナス")).toHaveValue("500");
  await expect(rules.getByLabel("チェックポイントのボーナス")).toHaveValue(
    "100",
  );
  await expect(rules.getByLabel("ラウンドの上限")).toHaveValue("20");
  await expect(rules.getByLabel("サイコロの目（最小）")).toHaveValue("2");
  await expect(rules.getByLabel("サイコロの目（最大）")).toHaveValue("12");
});

test("決まりに反する既定のルールを保存すると誤りが出て、入力した値が残り、保存した値は変わらない", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("ルール"));
  const rules = section(page, "既定のルール");
  const save = rules.getByRole("button", { name: "ルールを保存" });

  await rules.getByLabel("目標の魔力").fill("0");
  await save.click();
  await expect(
    rules.getByText("目標の魔力は 1 以上にしてください"),
  ).toBeVisible();
  await expect(rules.getByLabel("目標の魔力")).toHaveValue("0");

  await rules.getByLabel("目標の魔力").fill("600");
  await save.click();
  await expect(
    rules.getByText("目標の魔力は開始時の魔力より大きくしてください"),
  ).toBeVisible();

  await rules.getByLabel("目標の魔力").fill("8000");
  await rules.getByLabel("周回のボーナス").fill("-100");
  await rules.getByLabel("ラウンドの上限").fill("0");
  await rules.getByLabel("サイコロの目（最小）").fill("4");
  await rules.getByLabel("サイコロの目（最大）").fill("3");
  await save.click();
  await expect(
    rules.getByText("周回のボーナスは 0 以上にしてください"),
  ).toBeVisible();
  await expect(
    rules.getByText("ラウンドの上限は 1 以上にしてください"),
  ).toBeVisible();
  await expect(
    rules.getByText(
      "サイコロの目（最大）はサイコロの目（最小）以上にしてください",
    ),
  ).toBeVisible();

  await page.reload();
  await expect(rules.getByLabel("目標の魔力")).toHaveValue("8000");
  await expect(rules.getByLabel("周回のボーナス")).toHaveValue("300");
  await expect(rules.getByLabel("サイコロの目（最大）")).toHaveValue("6");
});

test("一覧に、マスの数（土地・拠点・チェックポイント・転送円・橋・施設）と既定のルールが出て、準備中のボードだけ公開できない理由の数か「公開できます」が出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const ready = uniqueName("公開可");
  await registerBoard(page, ready);
  // 拠点から行ける一本道に、土地・施設・転送円と橋の対を足す（対は道として数えられる）
  await putTiles(page, "拠点", [[0, 0]]);
  await putTiles(page, "火属性の土地", [
    [1, 0],
    [2, 0],
  ]);
  await putTiles(page, "水属性の土地", [[3, 0]]);
  await putTiles(page, "チェックポイント", [[4, 0]]);
  await putTiles(page, "聖堂", [[0, 1]]);
  await putTiles(page, "ほこら", [[1, 1]]);
  await putTiles(page, "占い館", [[2, 1]]);
  await putTiles(page, "カード屋", [[3, 1]]);
  await putTiles(page, "転送円", [
    [5, 0],
    [7, 0],
  ]);
  await putTiles(page, "橋", [
    [0, 2],
    [2, 2],
  ]);
  await saveLayout(page);
  const problem = uniqueName("理由あり");
  await registerBoard(page, problem);
  const published = uniqueName("公開済");
  await registerBoard(page, published);
  await savePublishableLayout(page);
  await section(page, "公開").getByRole("button", { name: "公開する" }).click();
  await expect(detail(page, "状態")).toHaveText("公開中");

  async function row(name: string) {
    await expect(async () => {
      await page.goto(`/boards?name=${encodeURIComponent(name)}`);
      await expect(boardRows(page)).toHaveCount(1, { timeout: 1_000 });
    }).toPass();
    return boardRows(page);
  }

  const readyRow = await row(ready);
  await expect(readyRow).toContainText(
    "拠点 1・チェックポイント 1・土地 3（火 2・地 0・水 1・風 0・無 0・複 0）・転送円 2・橋 2・聖堂 1・ほこら 1・占い館 1・カード屋 1",
  );
  await expect(readyRow).toContainText(
    "目標の魔力 8000・開始時の魔力 600・周回のボーナス 300・チェックポイントのボーナス 100・ラウンドの上限 30・サイコロの目（最小） 1・サイコロの目（最大） 6",
  );
  await expect(readyRow).toContainText("公開できます");
  // 空のボードの理由は、拠点の数とチェックポイントの 2 件
  await expect(await row(problem)).toContainText("公開できない理由 2 件");
  const publishedRow = await row(published);
  await expect(publishedRow).toContainText("目標の魔力");
  await expect(publishedRow).not.toContainText("公開できない理由");
  await expect(publishedRow).not.toContainText("公開できます");
});

test("転送円の相手待ちは白い点線の枠と凡例の印の欄に出て、道具を変えると外れ、転送円の道具に戻しても無い", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("相手待ち"));
  const editor = section(page, "レイアウト");
  await putTiles(page, "転送円", [[0, 0]]);

  await expect(tileButton(page, 0, 0)).toHaveAttribute("data-waiting", "true");
  await expect(editor.getByRole("list", { name: "印" })).toContainText(
    "相手待ちの枠",
  );

  await editor.getByLabel("拠点", { exact: true }).check();
  await expect(page.locator("[data-waiting]")).toHaveCount(0);
  await expect(editor.getByText("相手待ちの枠")).toHaveCount(0);
  await editor.getByLabel("転送円", { exact: true }).check();
  await expect(page.locator("[data-waiting]")).toHaveCount(0);
  await expect(editor.getByText("相手待ちの枠")).toHaveCount(0);
});
