import type { Page } from "@playwright/test";
import { loginAsOperator, uniqueName } from "./card";
import { expect, test } from "./fixtures";
import { createFullNpcDeck, createNpcDeck } from "./npc-deck";
import {
  createFullPresetDeck,
  createPresetDeck,
  searchCards,
  section,
} from "./preset-deck";
import { createTenCreatures } from "./starter-deck";

// 前準備（カード・プリセットデッキ・NPC のデッキ）は GraphQL で入れ（tests/npc-deck.ts）、確かめる画面の操作だけを画面でする。
// 画面で空から登録する流れは、1 本目のテストで確かめている。公開中の NPC のデッキの数に上限は無いため、公開したまま終わってよい。
// 部品を共有するスターターデッキの画面で確かめている流れ（名前の重複・先に変えられたとき・写した元が変わった・消えたとき）は重ねない

function deckRows(page: Page) {
  return page.locator("tbody tr");
}

// 詳細の「用語 → 説明」の説明を返す
function detail(page: Page, term: string) {
  return page
    .locator("dt", { hasText: new RegExp(`^${term}$`) })
    .locator("xpath=following-sibling::dd[1]");
}

test("空から登録すると詳細の画面に移り、一覧に準備中・合計 0 枚で出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("火・地");

  await page.goto("/npc-decks/new");
  const empty = section(page, "空から作る");
  await empty.getByLabel("名前").fill(name);
  await empty.getByRole("button", { name: "登録する" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page).toHaveURL(/\/npc-decks\/[0-9a-f-]{36}$/);
  await expect(detail(page, "状態")).toHaveText("準備中");
  await expect(section(page, "入れたカード")).toContainText(
    "カードが入っていません",
  );
  await expect(async () => {
    await page.goto(`/npc-decks?name=${encodeURIComponent(name)}`);
    await expect(deckRows(page)).toHaveCount(1, { timeout: 1_000 });
  }).toPass();
  await expect(deckRows(page).first()).toContainText(name);
  await expect(deckRows(page).first()).toContainText("準備中");
  await expect(deckRows(page).first().locator("td").nth(2)).toHaveText("0");
});

test("プリセットデッキからコピーして登録すると、入れておいた元の名前でカードがコピーされ、コピー元が出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("火・地");
  const presetDeckURL = await createFullPresetDeck(page, name);

  await expect(async () => {
    await page.goto(`/npc-decks/new?name=${encodeURIComponent(name)}`);
    await expect(
      page.getByRole("button", { name: `${name}をコピーして作る` }),
    ).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await page.getByRole("button", { name: `${name}をコピーして作る` }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page).toHaveURL(/\/npc-decks\/[0-9a-f-]{36}$/);
  await expect(detail(page, "合計の枚数")).toHaveText("40");
  await expect(section(page, "入れたカード").locator("tbody tr")).toHaveCount(
    10,
  );
  await expect(
    section(page, "コピー元").getByRole("link", {
      name: "コピー元のプリセットデッキ",
    }),
  ).toHaveAttribute("href", presetDeckURL);
});

test("同じプリセットデッキから名前を変えて 2 つ目をコピーして作れ、使われている名前は入力欄の誤りになって入力した値が残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("火・地");
  await createPresetDeck(page, name);
  const copyPage = `/npc-decks/new?name=${encodeURIComponent(name)}`;
  const nameInput = page.getByLabel(`${name}からコピーして作るデッキの名前`);
  const copyButton = page.getByRole("button", {
    name: `${name}をコピーして作る`,
  });
  await expect(async () => {
    await page.goto(copyPage);
    await expect(copyButton).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await copyButton.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);

  await page.goto(copyPage);
  await expect(nameInput).toHaveValue(name);
  await copyButton.click();
  await expect(
    section(page, "プリセットデッキからコピーして作る").getByText(
      "この名前はすでに使われています",
    ),
  ).toBeVisible();
  await expect(nameInput).toHaveValue(name);

  const second = uniqueName("火・地2");
  await nameInput.fill(second);
  await copyButton.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(second);
  await expect(detail(page, "合計の枚数")).toHaveText("0");
});

test("名前を変えると詳細の見出しと入力欄が新しい名前になる", async ({
  page,
}) => {
  await loginAsOperator(page);
  await page.goto(await createNpcDeck(page, uniqueName("火・地")));
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
  const { id, names: cards } = await createTenCreatures(page);
  const deckURL = await createNpcDeck(page, uniqueName("火・地"));
  await searchCards(page, deckURL, id, 10);
  const candidates = section(page, "カードを探す");
  for (const card of cards) {
    await candidates.getByLabel(`${card}の枚数`).fill("4");
  }
  await candidates.getByRole("button", { name: "枚数を保存" }).click();
  await expect(candidates.getByText("枚数を保存しました")).toBeVisible();
  await page.goto(deckURL);

  const deckCards = section(page, "入れたカード");
  await expect(deckCards.locator("tbody tr")).toHaveCount(10);
  await expect(detail(page, "合計の枚数")).toHaveText("40");

  await deckCards.getByLabel(`${cards[0]}の枚数`).fill("0");
  await deckCards.getByRole("button", { name: "枚数を保存" }).click();

  await expect(deckCards.getByText("枚数を保存しました")).toBeVisible();
  await expect(deckCards.getByLabel(`${cards[0]}の枚数`)).toHaveCount(0);
  await expect(detail(page, "合計の枚数")).toHaveText("36");
});

test("合計が 40 枚でない NPC のデッキを公開しようとすると、足りない旨の誤りが出て準備中のまま", async ({
  page,
}) => {
  await loginAsOperator(page);
  await page.goto(await createNpcDeck(page, uniqueName("作りかけ")));

  await section(page, "公開").getByRole("button", { name: "公開する" }).click();

  // 40 は studio に書き写さず、core が返した値を表示する
  await expect(
    section(page, "公開").getByText(
      "カードの合計をちょうど 40 枚にしてから公開してください",
    ),
  ).toBeVisible();
  await expect(detail(page, "状態")).toHaveText("準備中");
});

test("公開すると変更と削除ができなくなり、使用不可にすると公開し直せる", async ({
  page,
}) => {
  await loginAsOperator(page);
  await page.goto(await createFullNpcDeck(page, uniqueName("火・地")));

  const publish = section(page, "公開");
  await publish.getByRole("button", { name: "公開する" }).click();
  await expect(publish.getByText("公開しました")).toBeVisible();
  await expect(detail(page, "状態")).toHaveText("公開中");
  await expect(section(page, "名前の変更")).toHaveCount(0);
  await expect(section(page, "削除")).toHaveCount(0);
  await expect(section(page, "カードを探す")).toHaveCount(0);
  await expect(section(page, "入れたカード").getByRole("textbox")).toHaveCount(
    0,
  );

  await publish.getByRole("button", { name: "使用不可にする" }).click();
  await expect(publish.getByText("使用不可にしました")).toBeVisible();
  await expect(detail(page, "状態")).toHaveText("使用不可");
  await expect(section(page, "名前の変更")).toHaveCount(0);

  await publish.getByRole("button", { name: "公開する" }).click();
  await expect(detail(page, "状態")).toHaveText("公開中");
});

test("状態で絞り込むと、その状態の NPC のデッキだけが出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("水・風");
  await createNpcDeck(page, name);
  await expect(async () => {
    await page.goto(`/npc-decks?name=${encodeURIComponent(name)}`);
    await expect(deckRows(page)).toHaveCount(1, { timeout: 1_000 });
  }).toPass();

  await page.getByLabel("公開中").check();
  await page.getByRole("button", { name: "絞り込む" }).click();
  await expect(page).toHaveURL(/status=PUBLISHED/);
  await expect(page.getByText("NPC のデッキがありません")).toBeVisible();

  await page.getByLabel("公開中").uncheck();
  await page.getByLabel("準備中").check();
  await page.getByRole("button", { name: "絞り込む" }).click();
  await expect(page).toHaveURL(/status=DRAFT/);
  await expect(deckRows(page)).toHaveCount(1);
  await expect(deckRows(page).first()).toContainText(name);
});

test("削除を確かめてから削除すると一覧の画面に移り、詳細は見つからなくなる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("水・風");
  const deckURL = await createNpcDeck(page, name);
  await page.goto(deckURL);

  const del = section(page, "削除");
  await del.getByRole("button", { name: "削除する" }).click();
  await expect(
    del.getByText(`「${name}」を削除します。よろしいですか？`),
  ).toBeVisible();
  await del.getByRole("button", { name: "削除する" }).click();

  await expect(page).toHaveURL(/\/npc-decks$/);
  await expect(async () => {
    await page.goto(deckURL);
    await expect(
      page.getByText("この NPC のデッキは見つかりません"),
    ).toBeVisible({ timeout: 1_000 });
  }).toPass();
});
