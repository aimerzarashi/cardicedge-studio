import type { Page } from "@playwright/test";
import { loginAsOperator, retireCard, uniqueName } from "./card";
import { expect, test } from "./fixtures";
import { createFullPresetDeck, searchCards, section } from "./preset-deck";
import {
  createFullStarterDeck,
  createStarterDeck,
  createTenCreatures,
  registerStarterDeck,
} from "./starter-deck";

// 公開中のスターターデッキの数には上限があり、core の DB を共有するため、公開するテストは公開したまま終わらない
// （使用不可にして終える）。公開するテストは同じファイルの中で順に流れる（fullyParallel にしていないため）。
// ほかのファイルのテストは、スターターデッキを公開しない。
// 前準備（カード・プリセットデッキ・スターターデッキ）は GraphQL で入れ（tests/core.ts）、確かめる画面の操作だけを画面でする。
// 画面で空から登録する流れは、1 本目のテストで確かめている

function deckRows(page: Page) {
  return page.locator("tbody tr");
}

test("空から登録すると詳細の画面に移り、一覧に準備中・合計 0 枚で出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("火・地");

  await registerStarterDeck(page, name);

  await expect(page).toHaveURL(/\/starter-decks\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("definition").first()).toHaveText("準備中");
  await expect(section(page, "入れたカード")).toContainText(
    "カードが入っていません",
  );
  await expect(async () => {
    await page.goto(`/starter-decks?name=${encodeURIComponent(name)}`);
    await expect(deckRows(page)).toHaveCount(1, { timeout: 1_000 });
  }).toPass();
  await expect(deckRows(page).first()).toContainText(name);
  await expect(deckRows(page).first()).toContainText("準備中");
  await expect(deckRows(page).first().locator("td").nth(2)).toHaveText("0");
});

test("使われている名前で登録すると名前の重複が表示され、入力した値が残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("水・風");
  await createStarterDeck(page, name);

  await page.goto("/starter-decks/new");
  const empty = section(page, "空から作る");
  await empty.getByLabel("名前").fill(name);
  await empty.getByRole("button", { name: "登録する" }).click();

  await expect(empty.getByText("この名前はすでに使われています")).toBeVisible();
  await expect(empty.getByLabel("名前")).toHaveValue(name);
});

test("プリセットデッキから写して登録すると、名前とカードが写り、写した元が出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("火・地");
  const presetDeckURL = await createFullPresetDeck(page, name);

  await expect(async () => {
    await page.goto(`/starter-decks/new?name=${encodeURIComponent(name)}`);
    await expect(
      page.getByRole("button", { name: `${name}を写して作る` }),
    ).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await page.getByRole("button", { name: `${name}を写して作る` }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page).toHaveURL(/\/starter-decks\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("definition").nth(1)).toHaveText("40");
  await expect(section(page, "入れたカード").locator("tbody tr")).toHaveCount(
    10,
  );
  const source = section(page, "写した元");
  await expect(
    source.getByRole("link", { name: "元のプリセットデッキ" }),
  ).toHaveAttribute("href", presetDeckURL);
  await expect(
    source.getByText("元のプリセットデッキが変わっています"),
  ).toHaveCount(0);
});

test("写した後に元のプリセットデッキを変えると「変わっています」が出て、写したデッキは変わらない", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("火・地");
  const presetDeckURL = await createFullPresetDeck(page, name);
  await expect(async () => {
    await page.goto(`/starter-decks/new?name=${encodeURIComponent(name)}`);
    await page
      .getByRole("button", { name: `${name}を写して作る` })
      .click({ timeout: 1_000 });
  }).toPass();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  const starterDeckURL = new URL(page.url()).pathname;

  await page.goto(presetDeckURL);
  const rename = section(page, "名前の変更");
  await rename.getByLabel("名前").fill(uniqueName("炎・大地"));
  await rename.getByRole("button", { name: "名前を変える" }).click();
  await expect(rename.getByText("名前を変えました")).toBeVisible();

  // 投影されるまで開き直す
  await expect(async () => {
    await page.goto(starterDeckURL);
    await expect(
      section(page, "写した元").getByText(
        "元のプリセットデッキが変わっています",
      ),
    ).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
});

test("元のプリセットデッキを削除すると、写した元に「削除されています」が出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("火・地");
  const presetDeckURL = await createFullPresetDeck(page, name);
  await expect(async () => {
    await page.goto(`/starter-decks/new?name=${encodeURIComponent(name)}`);
    await page
      .getByRole("button", { name: `${name}を写して作る` })
      .click({ timeout: 1_000 });
  }).toPass();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  const starterDeckURL = new URL(page.url()).pathname;
  await page.goto(presetDeckURL);
  const del = section(page, "削除");
  await del.getByRole("button", { name: "削除する" }).click();
  await del.getByRole("button", { name: "削除する" }).click();
  await expect(page).toHaveURL(/\/preset-decks$/);

  await expect(async () => {
    await page.goto(starterDeckURL);
    await expect(
      section(page, "写した元").getByText(
        "元のプリセットデッキは削除されています",
      ),
    ).toBeVisible({ timeout: 1_000 });
  }).toPass();
});

test("名前を変えると詳細の見出しと入力欄が新しい名前になる", async ({
  page,
}) => {
  await loginAsOperator(page);
  await page.goto(await createStarterDeck(page, uniqueName("火・地")));
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
  const deckURL = await createStarterDeck(page, uniqueName("火・地"));
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
  await expect(page.getByRole("definition").nth(1)).toHaveText("40");

  await deckCards.getByLabel(`${cards[0]}の枚数`).fill("0");
  await deckCards.getByRole("button", { name: "枚数を保存" }).click();

  await expect(deckCards.getByText("枚数を保存しました")).toBeVisible();
  await expect(deckCards.getByLabel(`${cards[0]}の枚数`)).toHaveCount(0);
  await expect(page.getByRole("definition").nth(1)).toHaveText("36");
});

test("合計が 40 枚でないスターターデッキを公開しようとすると、足りない旨の誤りが出て準備中のまま", async ({
  page,
}) => {
  await loginAsOperator(page);
  await page.goto(await createStarterDeck(page, uniqueName("作りかけ")));

  await section(page, "公開").getByRole("button", { name: "公開する" }).click();

  // 40 は studio に書き写さず、core が返した値を表示する
  await expect(
    section(page, "公開").getByText(
      "カードの合計をちょうど 40 枚にしてから公開してください",
    ),
  ).toBeVisible();
  await expect(page.getByRole("definition").first()).toHaveText("準備中");
});

test("入っているカードが公開中でなくなったスターターデッキを公開しようとすると、公開中でないカードの誤りが出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const { deckURL, cards } = await createFullStarterDeck(
    page,
    uniqueName("火・地"),
  );
  await retireCard(page, cards[0]);

  await page.goto(deckURL);
  await section(page, "公開").getByRole("button", { name: "公開する" }).click();

  await expect(
    section(page, "公開").getByText("公開中でないカードが入っています"),
  ).toBeVisible();
  await expect(page.getByRole("definition").first()).toHaveText("準備中");
});

test("公開すると変更と削除ができなくなり、使用不可にすると新しく公開し直せる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("火・地");
  const { deckURL } = await createFullStarterDeck(page, name);
  await page.goto(deckURL);

  const publish = section(page, "公開");
  await publish.getByRole("button", { name: "公開する" }).click();
  await expect(publish.getByText("公開しました")).toBeVisible();
  await expect(page.getByRole("definition").first()).toHaveText("公開中");
  await expect(section(page, "名前の変更")).toHaveCount(0);
  await expect(section(page, "削除")).toHaveCount(0);
  await expect(section(page, "カードを探す")).toHaveCount(0);
  await expect(section(page, "入れたカード").getByRole("textbox")).toHaveCount(
    0,
  );

  await publish.getByRole("button", { name: "使用不可にする" }).click();
  await expect(publish.getByText("使用不可にしました")).toBeVisible();
  await expect(page.getByRole("definition").first()).toHaveText("使用不可");
  await expect(section(page, "名前の変更")).toHaveCount(0);

  // 使用不可から公開に戻せる。戻したら使用不可にして終える
  await publish.getByRole("button", { name: "公開する" }).click();
  await expect(page.getByRole("definition").first()).toHaveText("公開中");
  await publish.getByRole("button", { name: "使用不可にする" }).click();
  await expect(page.getByRole("definition").first()).toHaveText("使用不可");
});

test("状態で絞り込むと、その状態のスターターデッキだけが出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("火・地");
  await createStarterDeck(page, name);
  await expect(async () => {
    await page.goto(`/starter-decks?name=${encodeURIComponent(name)}`);
    await expect(deckRows(page)).toHaveCount(1, { timeout: 1_000 });
  }).toPass();

  await page.getByLabel("公開中").check();
  await page.getByRole("button", { name: "絞り込む" }).click();
  await expect(page).toHaveURL(/status=PUBLISHED/);
  await expect(page.getByText("スターターデッキがありません")).toBeVisible();

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
  const deckURL = await createStarterDeck(page, name);
  await page.goto(deckURL);

  const del = section(page, "削除");
  await del.getByRole("button", { name: "削除する" }).click();
  await expect(
    del.getByText(`「${name}」を削除します。よろしいですか？`),
  ).toBeVisible();
  await del.getByRole("button", { name: "削除する" }).click();

  await expect(page).toHaveURL(/\/starter-decks$/);
  await expect(async () => {
    await page.goto(deckURL);
    await expect(
      page.getByText("このスターターデッキは見つかりません"),
    ).toBeVisible({ timeout: 1_000 });
  }).toPass();
});

test("ほかの画面で先に公開されていると、名前は変わらず、最新の状態に切り替わって変更の欄が無くなる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("火・地");
  const { deckURL } = await createFullStarterDeck(page, name);
  await page.goto(deckURL);
  const other = await page.context().newPage();
  await other.goto(deckURL);
  await expect(other.getByRole("heading", { level: 1 })).toHaveText(name);
  const publish = section(page, "公開");
  await publish.getByRole("button", { name: "公開する" }).click();
  await expect(publish.getByText("公開しました")).toBeVisible();

  const stale = section(other, "名前の変更");
  await stale.getByLabel("名前").fill(uniqueName("水・風"));
  await stale.getByRole("button", { name: "名前を変える" }).click();

  // 公開すると revision が進むため、先に変えられたことになり、出し直した画面は公開中のものになる
  await expect(other.getByRole("definition").first()).toHaveText("公開中");
  await expect(stale).toHaveCount(0);
  await expect(other.getByRole("heading", { level: 1 })).toHaveText(name);
  await section(other, "公開")
    .getByRole("button", { name: "使用不可にする" })
    .click();
  await expect(other.getByRole("definition").first()).toHaveText("使用不可");
});

test("公開中の数の上限に達していると、上限の数が出て準備中のまま", async ({
  page,
}) => {
  await loginAsOperator(page);
  // テストの core の公開中の上限は既定の 2。ほかのテストは公開したら使用不可にして終えるため、ここで 2 つ公開すれば埋まる
  const decks = [];
  for (const base of ["火・地", "水・風", "光・闇"]) {
    decks.push((await createFullStarterDeck(page, uniqueName(base))).deckURL);
  }
  const published: string[] = [];
  try {
    for (const deckURL of decks.slice(0, 2)) {
      await page.goto(deckURL);
      const publish = section(page, "公開");
      await publish.getByRole("button", { name: "公開する" }).click();
      await expect(publish.getByText("公開しました")).toBeVisible();
      published.push(deckURL);
    }

    await page.goto(decks[2]);
    const publish = section(page, "公開");
    await publish.getByRole("button", { name: "公開する" }).click();
    await expect(
      publish.getByText(
        "公開中のスターターデッキは 2 個までです。ほかのものを使用不可にすると公開できます",
      ),
    ).toBeVisible();
    await expect(page.getByRole("definition").first()).toHaveText("準備中");
  } finally {
    for (const deckURL of published) {
      await page.goto(deckURL);
      await section(page, "公開")
        .getByRole("button", { name: "使用不可にする" })
        .click();
      await expect(page.getByRole("definition").first()).toHaveText("使用不可");
    }
  }
});
