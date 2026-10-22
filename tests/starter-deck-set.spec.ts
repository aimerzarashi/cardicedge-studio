import type { Page } from "@playwright/test";
import { loginAsOperator, uniqueName } from "./card";
import { expect, test } from "./fixtures";
import {
  registerAndOpen,
  registerFullPresetDeck,
  section,
} from "./preset-deck";

// スターターデッキセットはゲーム全体で 1 つなので、このファイルのテストは順に流す（playwright.config.ts で fullyParallel に
// していないため、同じファイルのテストは 1 つの worker で順に流れる）。ほかのファイルのテストは、スターターデッキセットを変えない。
// 並列にすると、取り合って revision が合わずに「先に変えられた」になる

// 変更の画面を、何も選んでいない状態で、名前で絞り込んで開き、名前の順に選ぶ
async function selectPresetDecks(page: Page, filter: string, names: string[]) {
  await page.goto(`/starter-deck-set/edit?name=${encodeURIComponent(filter)}`);
  for (const name of names) {
    await page.getByRole("link", { name: `${name}を選ぶ` }).click();
    await expect(
      section(page, "選んだプリセットデッキ").getByRole("link", { name }),
    ).toBeVisible();
  }
}

async function setStarterDeckSet(page: Page) {
  await section(page, "選んだプリセットデッキ")
    .getByRole("button", { name: "設定する" })
    .click();
}

// 2 つのプリセットデッキを作って設定し、照会の画面を開いた状態にする
async function setTwoPresetDecks(page: Page, id: string) {
  const fireEarth = `火・地-${id}`;
  const waterWind = `水・風-${id}`;
  const fireEarthURL = await registerFullPresetDeck(page, fireEarth);
  const waterWindURL = await registerFullPresetDeck(page, waterWind);
  await selectPresetDecks(page, id, [fireEarth, waterWind]);
  await setStarterDeckSet(page);
  await expect(page).toHaveURL(/\/starter-deck-set$/);
  return { fireEarth, waterWind, fireEarthURL, waterWindURL };
}

test("2 つのプリセットデッキを選んで設定すると、照会の画面に写しが出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const id = crypto.randomUUID().slice(0, 8);

  const { fireEarth, waterWind } = await setTwoPresetDecks(page, id);

  for (const name of [fireEarth, waterWind]) {
    const deck = section(page, name);
    await expect(deck.getByRole("heading", { level: 2 })).toHaveText(name);
    await expect(deck.locator("tbody tr")).toHaveCount(10);
    await expect(deck.locator("tbody tr").first()).toContainText("4");
    await expect(
      deck.getByRole("link", { name: "元のプリセットデッキ" }),
    ).toBeVisible();
  }
});

test("元のプリセットデッキを変えると「変わっている」が出て、変更の画面で設定し直すと消える", async ({
  page,
}) => {
  await loginAsOperator(page);
  const id = crypto.randomUUID().slice(0, 8);
  const { fireEarth, fireEarthURL } = await setTwoPresetDecks(page, id);
  const renamed = uniqueName("炎・大地");
  await page.goto(fireEarthURL);
  const rename = section(page, "名前の変更");
  await rename.getByLabel("名前").fill(renamed);
  await rename.getByRole("button", { name: "名前を変える" }).click();
  await expect(rename.getByText("名前を変えました")).toBeVisible();

  // 写しは変わらず、元が変わったことだけが出る（投影されるまで開き直す）
  await expect(async () => {
    await page.goto("/starter-deck-set");
    await expect(
      section(page, fireEarth).getByText(
        "元のプリセットデッキが変わっています",
      ),
    ).toBeVisible();
  }).toPass();

  // 変更の画面は今の元を選んだ状態で開くので、そのまま設定すれば写し直せる
  await section(page, fireEarth)
    .getByRole("link", { name: "変更する" })
    .click();
  await expect(
    section(page, "選んだプリセットデッキ").getByRole("link", {
      name: renamed,
    }),
  ).toBeVisible();
  await setStarterDeckSet(page);

  await expect(page).toHaveURL(/\/starter-deck-set$/);
  await expect(section(page, renamed)).toBeVisible();
  await expect(
    page.getByText("元のプリセットデッキが変わっています"),
  ).toHaveCount(0);
});

test("合計が 40 枚でないプリセットデッキを選んで設定すると、そのデッキに誤りが出て設定は変わらない", async ({
  page,
}) => {
  await loginAsOperator(page);
  const id = crypto.randomUUID().slice(0, 8);
  const full = `火・地-${id}`;
  const empty = `作りかけ-${id}`;
  await registerFullPresetDeck(page, full);
  await registerAndOpen(page, empty);
  await selectPresetDecks(page, id, [full, empty]);

  await setStarterDeckSet(page);

  // 40 は studio に書き写さず、core が返した値を表示する
  await expect(
    section(page, "選んだプリセットデッキ").getByText(
      "合計がちょうど 40 枚のプリセットデッキを選んでください",
    ),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/starter-deck-set\/edit/);
});

test("元のプリセットデッキを削除すると「削除されている」が出て、変更の画面では選ばれていない", async ({
  page,
}) => {
  await loginAsOperator(page);
  const id = crypto.randomUUID().slice(0, 8);
  const { fireEarth, waterWind, fireEarthURL } = await setTwoPresetDecks(
    page,
    id,
  );
  await page.goto(fireEarthURL);
  const del = section(page, "削除");
  await del.getByRole("button", { name: "削除する" }).click();
  await del.getByRole("button", { name: "削除する" }).click();
  await expect(page).toHaveURL(/\/preset-decks$/);

  // 写しは残り、元が削除されたことが出る（投影されるまで開き直す）
  await expect(async () => {
    await page.goto("/starter-deck-set");
    await expect(
      section(page, fireEarth).getByText(
        "元のプリセットデッキは削除されています",
      ),
    ).toBeVisible();
  }).toPass();

  await page.getByRole("link", { name: "変更する" }).last().click();
  const selected = section(page, "選んだプリセットデッキ");
  await expect(selected.locator("tbody tr")).toHaveCount(1);
  await expect(selected.getByRole("link", { name: waterWind })).toBeVisible();
});

test("ほかの画面で先に設定されていると、設定せずに知らせる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const id = crypto.randomUUID().slice(0, 8);
  const { fireEarth, waterWind, fireEarthURL } = await setTwoPresetDecks(
    page,
    id,
  );
  // 同じオペレーターが変更の画面を 2 つ開いておく
  await page.getByRole("link", { name: "変更する" }).last().click();
  await expect(page).toHaveURL(/\/starter-deck-set\/edit\?/);
  const editURL = page.url();
  const other = await page.context().newPage();
  await other.goto(editURL);
  await expect(
    section(other, "選んだプリセットデッキ").getByRole("link", {
      name: fireEarth,
    }),
  ).toBeVisible();
  // 写す中身が今と同じなら core は何も変えず revision も進めないため、元を変えてから 1 つ目の画面で設定し直す
  await page.goto(fireEarthURL);
  const rename = section(page, "名前の変更");
  await rename.getByLabel("名前").fill(uniqueName("炎・大地"));
  await rename.getByRole("button", { name: "名前を変える" }).click();
  await expect(rename.getByText("名前を変えました")).toBeVisible();
  await page.goto(editURL);
  await setStarterDeckSet(page);
  await expect(page).toHaveURL(/\/starter-deck-set$/);

  await setStarterDeckSet(other);

  await expect(
    other.getByText("ほかの操作で変わっていたため、設定しませんでした"),
  ).toBeVisible();
  await expect(
    section(other, "選んだプリセットデッキ").getByRole("link", {
      name: waterWind,
    }),
  ).toBeVisible();
});
