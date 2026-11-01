import type { Page } from "@playwright/test";
import {
  createDraftCreatures,
  createPublishedCreatures,
  loginAsOperator,
  retireCard,
  uniqueName,
} from "./card";
import { expect, test } from "./fixtures";
import {
  createPresetDeck,
  registerAndOpen,
  registerPresetDeck,
  searchCards,
  section,
} from "./preset-deck";

// 前準備（カード・プリセットデッキ）は GraphQL で入れ（tests/core.ts）、確かめる画面の操作だけを画面でする。
// 画面で登録する流れは、1 本目のテストで確かめている
function deckRows(page: Page) {
  return page.locator("tbody tr");
}

test("登録すると詳細の画面に移り、一覧に合計 0 枚で出る", async ({ page }) => {
  await loginAsOperator(page);
  const name = uniqueName("火・地");

  await registerAndOpen(page, name);

  await expect(page).toHaveURL(/\/preset-decks\/[0-9a-f-]{36}$/);
  await expect(section(page, "入れたカード")).toContainText(
    "カードが入っていません",
  );
  await expect(async () => {
    await page.goto(`/preset-decks?name=${encodeURIComponent(name)}`);
    await expect(deckRows(page)).toHaveCount(1);
  }).toPass();
  await expect(deckRows(page).first()).toContainText(name);
  await expect(deckRows(page).first().locator("td").nth(1)).toHaveText("0");

  await deckRows(page).first().getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
});

test("使われている名前で登録すると名前の重複が表示され、入力した値が残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("水・風");
  await createPresetDeck(page, name);

  await registerPresetDeck(page, name);

  await expect(page.getByText("この名前はすでに使われています")).toBeVisible();
  await expect(page.getByLabel("名前")).toHaveValue(name);
});

test("名前を変えると詳細の見出しと入力欄が新しい名前になる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("火・地");
  await page.goto(await createPresetDeck(page, name));
  const renamed = uniqueName("炎・大地");

  const rename = section(page, "名前の変更");
  await rename.getByLabel("名前").fill(renamed);
  await rename.getByRole("button", { name: "名前を変える" }).click();

  await expect(rename.getByText("名前を変えました")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(renamed);
  await expect(rename.getByLabel("名前")).toHaveValue(renamed);
});

test("カードを探して枚数を保存すると入れたカードに出て、0 にすると外れる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const id = crypto.randomUUID().slice(0, 8);
  await createPublishedCreatures(page, [`a-${id}`, `b-${id}`], id);
  const deckURL = await createPresetDeck(page, uniqueName("火・地"));
  await searchCards(page, deckURL, id, 2);

  const candidates = section(page, "カードを探す");
  await candidates.getByLabel(`a-${id}の枚数`).fill("3");
  await candidates.getByLabel(`b-${id}の枚数`).fill("2");
  await candidates.getByRole("button", { name: "枚数を保存" }).click();

  await expect(candidates.getByText("枚数を保存しました")).toBeVisible();
  const deckCards = section(page, "入れたカード");
  await expect(deckCards.getByLabel(`a-${id}の枚数`)).toHaveValue("3");
  await expect(deckCards.getByLabel(`b-${id}の枚数`)).toHaveValue("2");
  await expect(page.getByRole("definition").first()).toHaveText("5");

  await deckCards.getByLabel(`a-${id}の枚数`).fill("0");
  await deckCards.getByRole("button", { name: "枚数を保存" }).click();

  await expect(deckCards.getByText("枚数を保存しました")).toBeVisible();
  await expect(deckCards.getByLabel(`a-${id}の枚数`)).toHaveCount(0);
  await expect(deckCards.getByLabel(`b-${id}の枚数`)).toHaveValue("2");
  await expect(page.getByRole("definition").first()).toHaveText("2");
  // 探した側の表も、保存した後の枚数になる
  await expect(candidates.getByLabel(`a-${id}の枚数`)).toHaveValue("0");
});

test("枚数が範囲の外だとカードの行に誤りが表示され、入力した値が残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("ドラゴン");
  await createPublishedCreatures(page, [name], name);
  const deckURL = await createPresetDeck(page, uniqueName("火・地"));
  await searchCards(page, deckURL, name, 1);

  const candidates = section(page, "カードを探す");
  await candidates.getByLabel(`${name}の枚数`).fill("5");
  await candidates.getByRole("button", { name: "枚数を保存" }).click();

  // 範囲は studio に書き写さず、core が返した値を表示する
  await expect(
    candidates.getByText("枚数は 0〜4 枚にしてください"),
  ).toBeVisible();
  await expect(candidates.getByLabel(`${name}の枚数`)).toHaveValue("5");
  await expect(section(page, "入れたカード")).toContainText(
    "カードが入っていません",
  );
});

test("削除を確かめてから削除すると一覧の画面に移り、詳細は見つからなくなる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("水・風");
  const deckURL = await createPresetDeck(page, name);
  await page.goto(deckURL);

  const del = section(page, "削除");
  await del.getByRole("button", { name: "削除する" }).click();
  await expect(
    del.getByText(`「${name}」を削除します。よろしいですか？`),
  ).toBeVisible();
  await del.getByRole("button", { name: "やめる" }).click();
  await expect(del.getByText("よろしいですか？")).toHaveCount(0);

  await del.getByRole("button", { name: "削除する" }).click();
  await del.getByRole("button", { name: "削除する" }).click();

  await expect(page).toHaveURL(/\/preset-decks$/);
  await expect(async () => {
    await page.goto(deckURL);
    await expect(
      page.getByText("このプリセットデッキは見つかりません"),
    ).toBeVisible();
  }).toPass();
});

test("ほかの画面で先に変えられていると、変えずに最新の状態を表示して知らせる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("火・地");
  const deckURL = await createPresetDeck(page, name);
  await page.goto(deckURL);
  // 同じオペレーターが同じデッキをもう 1 つのページで開いておく
  const other = await page.context().newPage();
  await other.goto(deckURL);
  await expect(other.getByRole("heading", { level: 1 })).toHaveText(name);

  const renamed = uniqueName("炎・大地");
  const rename = section(page, "名前の変更");
  await rename.getByLabel("名前").fill(renamed);
  await rename.getByRole("button", { name: "名前を変える" }).click();
  await expect(rename.getByText("名前を変えました")).toBeVisible();

  const stale = section(other, "名前の変更");
  await stale.getByLabel("名前").fill(uniqueName("水・風"));
  await stale.getByRole("button", { name: "名前を変える" }).click();

  await expect(
    stale.getByText("ほかの操作で変わっていたため、変えませんでした"),
  ).toBeVisible();
  await expect(other.getByRole("heading", { level: 1 })).toHaveText(renamed);
  await expect(stale.getByLabel("名前")).toHaveValue(renamed);
});

test("カードを探す一覧には公開中のカードだけが出る", async ({ page }) => {
  await loginAsOperator(page);
  const id = crypto.randomUUID().slice(0, 8);
  await createDraftCreatures(page, [`draft-${id}`], id);
  await createPublishedCreatures(page, [`published-${id}`], id);
  const deckURL = await createPresetDeck(page, uniqueName("火・地"));

  await searchCards(page, deckURL, id, 1);

  const candidates = section(page, "カードを探す");
  await expect(candidates.getByLabel(`published-${id}の枚数`)).toBeVisible();
  await expect(candidates.getByLabel(`draft-${id}の枚数`)).toHaveCount(0);
});

test("探した後に公開中でなくなったカードを入れようとすると、そのカードの行に誤りが表示される", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("ドラゴン");
  await createPublishedCreatures(page, [name], name);
  const deckURL = await createPresetDeck(page, uniqueName("火・地"));
  await searchCards(page, deckURL, name, 1);
  const candidates = section(page, "カードを探す");
  await candidates.getByLabel(`${name}の枚数`).fill("2");
  const other = await page.context().newPage();
  await retireCard(other, name);

  await candidates.getByRole("button", { name: "枚数を保存" }).click();

  await expect(
    candidates.getByText("このカードは公開中でないため、入れられません"),
  ).toBeVisible();
  await expect(candidates.getByLabel(`${name}の枚数`)).toHaveValue("2");
});
