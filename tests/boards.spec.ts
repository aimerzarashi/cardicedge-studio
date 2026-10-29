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
      { base: { x: 0, y: 0 } },
      { checkpoint: { x: 1, y: 0 } },
      { land: { x: 2, y: 3, attribute: "FIRE" } },
      { land: { x: 4, y: 5, attribute: "FIRE" } },
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

test("道具を選んでマスを置くと、隣とつながり、保存すると詳細にマスの数とつながりの数が出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("一本道"));

  await putTiles(page, "拠点", [[0, 0]]);
  await putTiles(page, "火属性の土地", [[1, 0]]);
  await putTiles(page, "チェックポイント", [[2, 0]]);

  await expect(tileButton(page, 1, 0)).toHaveAccessibleName(
    "(1, 0) のマス 火属性の土地",
  );
  await expect(connectionButton(page, [0, 0], [1, 0])).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(connectionButton(page, [1, 0], [2, 0])).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await saveLayout(page);
  await expect(detail(page, "マス")).toHaveText("3");
  await expect(detail(page, "つながり")).toHaveText("2");
});

test("属性ごとの土地を置いて保存すると、詳細を開き直しても、その属性で出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("六属性"));

  const attributes = ["火", "地", "水", "風", "無", "複"] as const;
  for (const [x, attribute] of attributes.entries()) {
    await putTiles(page, `${attribute}属性の土地`, [[x, 0]]);
  }
  await putTiles(page, "拠点", [[0, 1]]);
  await putTiles(page, "チェックポイント", [[1, 1]]);
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
  await expect(section(page, "レイアウト").getByLabel("凡例")).toHaveText(
    "火属性の土地地属性の土地水属性の土地風属性の土地無属性の土地複属性の土地拠点チェックポイント",
  );
});

test("属性だけが違う道具でマスを上書きすると、属性が変わり、つながりは残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("塗り替え"));
  await putTiles(page, "火属性の土地", [
    [0, 0],
    [1, 0],
  ]);

  await putTiles(page, "水属性の土地", [[1, 0]]);

  await expect(tileButton(page, 1, 0)).toHaveAccessibleName(
    "(1, 0) のマス 水属性の土地",
  );
  await expect(connectionButton(page, [0, 0], [1, 0])).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await saveLayout(page);
  await expect(detail(page, "マス")).toHaveText("2");
  await expect(detail(page, "つながり")).toHaveText("1");
});

test("マスを消すとそのマスのつながりも消え、マスの無い側のつながりは押せない", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("一本道"));
  await putTiles(page, "火属性の土地", [
    [0, 0],
    [1, 0],
    [2, 0],
  ]);

  await putTiles(page, "消す", [[1, 0]]);

  await expect(tileButton(page, 1, 0)).toHaveAccessibleName("(1, 0) のマス");
  await expect(connectionButton(page, [0, 0], [1, 0])).toBeDisabled();
  await expect(connectionButton(page, [1, 0], [2, 0])).toBeDisabled();
  await putTiles(page, "火属性の土地", [[1, 0]]);
  await expect(connectionButton(page, [0, 0], [1, 0])).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("間の印を押すと、つながりを切る・つなぐができ、保存すると詳細のつながりの数に出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("二つの島"));
  await putTiles(page, "火属性の土地", [
    [0, 0],
    [1, 0],
  ]);
  const between = connectionButton(page, [0, 0], [1, 0]);

  await between.click();
  await expect(between).toHaveAttribute("aria-pressed", "false");
  await saveLayout(page);
  await expect(detail(page, "マス")).toHaveText("2");
  await expect(detail(page, "つながり")).toHaveText("0");

  await between.click();
  await expect(between).toHaveAttribute("aria-pressed", "true");
  await saveLayout(page);
  await expect(detail(page, "つながり")).toHaveText("1");
});

test("画面で作ったレイアウトを保存し、公開できる", async ({ page }) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("一本道"));
  await savePublishableLayout(page);

  const publish = section(page, "公開");
  await publish.getByRole("button", { name: "公開する" }).click();

  await expect(publish.getByText("公開しました")).toBeVisible();
  await expect(detail(page, "状態")).toHaveText("公開中");
});

test("幅を小さくして保存すると、格子の外に出たマスの誤りが出て、置いたマスは残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("狭い"));
  await putTiles(page, "火属性の土地", [[5, 0]]);

  const editor = section(page, "レイアウト");
  await editor.getByLabel("幅").fill("3");
  await expect(tileButton(page, 5, 0)).toHaveCount(0);
  await editor.getByRole("button", { name: "レイアウトを保存" }).click();

  await expect(
    editor.getByText(/\(5, 0\) のマスが格子の外です。列は 0〜2 の範囲/),
  ).toBeVisible();
  await editor.getByLabel("幅").fill("8");
  await expect(tileButton(page, 5, 0)).toHaveAccessibleName(
    "(5, 0) のマス 火属性の土地",
  );
});

test("公開中は、同じ格子が表示だけで出て、編集の操作は出ない", async ({
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

test("幅・高さに範囲の外の大きな数を入れても、格子は描き直されない", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("巨大"));
  const editor = section(page, "レイアウト");
  const cells = editor
    .getByRole("group", { name: "ボードの格子" })
    .getByRole("button");
  const before = await cells.count();

  await editor.getByLabel("幅").fill("99999");
  await editor.getByLabel("高さ").fill("99999");

  await expect(cells).toHaveCount(before);
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
  await rules.getByRole("button", { name: "ルールを保存" }).click();

  await expect(rules.getByText("ルールを保存しました")).toBeVisible();
  await page.reload();
  await expect(rules.getByLabel("目標の魔力")).toHaveValue("12000");
  await expect(rules.getByLabel("開始時の魔力")).toHaveValue("0");
  await expect(rules.getByLabel("周回のボーナス")).toHaveValue("500");
  await expect(rules.getByLabel("チェックポイントのボーナス")).toHaveValue(
    "100",
  );
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
  await save.click();
  await expect(
    rules.getByText("周回のボーナスは 0 以上にしてください"),
  ).toBeVisible();

  await page.reload();
  await expect(rules.getByLabel("目標の魔力")).toHaveValue("8000");
  await expect(rules.getByLabel("周回のボーナス")).toHaveValue("300");
});

test("公開中は、既定のルールが表示だけで出て、入力欄は出ない", async ({
  page,
}) => {
  await loginAsOperator(page);
  await registerBoard(page, uniqueName("ルール"));
  await savePublishableLayout(page);
  await section(page, "公開").getByRole("button", { name: "公開する" }).click();
  await expect(detail(page, "状態")).toHaveText("公開中");

  const rules = section(page, "既定のルール");
  await expect(detail(page, "目標の魔力")).toHaveText("8000");
  await expect(detail(page, "開始時の魔力")).toHaveText("600");
  await expect(detail(page, "周回のボーナス")).toHaveText("300");
  await expect(detail(page, "チェックポイントのボーナス")).toHaveText("100");
  await expect(rules.getByLabel("目標の魔力")).toHaveCount(0);
  await expect(rules.getByRole("button", { name: "ルールを保存" })).toHaveCount(
    0,
  );
});

test("一覧に、マスの数（土地・拠点・チェックポイントと属性ごと）と既定のルールが出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("一覧");
  await registerBoard(page, name);
  await putTiles(page, "火属性の土地", [
    [0, 0],
    [1, 0],
  ]);
  await putTiles(page, "水属性の土地", [[2, 0]]);
  await putTiles(page, "拠点", [[3, 0]]);
  await putTiles(page, "チェックポイント", [[4, 0]]);
  await saveLayout(page);

  await expect(async () => {
    await page.goto(`/boards?name=${encodeURIComponent(name)}`);
    await expect(boardRows(page)).toHaveCount(1, { timeout: 1_000 });
  }).toPass();
  await expect(boardRows(page)).toContainText(
    "拠点 1・チェックポイント 1・土地 3（火 2・地 0・水 1・風 0・無 0・複 0）",
  );
  await expect(boardRows(page)).toContainText(
    "目標の魔力 8000・開始時の魔力 600・周回のボーナス 300・チェックポイントのボーナス 100",
  );
});
