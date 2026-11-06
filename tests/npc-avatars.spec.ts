import type { Page } from "@playwright/test";
import { loginAsOperator, uniqueName } from "./card";
import { expect, test } from "./fixtures";
import { createNpcAvatar, createPublishableNpcAvatar } from "./npc-avatar";
import { createPublishedNpcDeck } from "./npc-deck";
import { section } from "./preset-deck";

// 前準備の NPC のアバターは GraphQL で入れ（tests/npc-avatar.ts）、確かめる画面の操作だけを画面でする。
// 画面で登録する流れは、1 本目のテストで確かめている。名前は 20 文字までのため、uniqueName の元は短くする

function avatarRows(page: Page) {
  return page.locator("tbody tr");
}

// 詳細の「用語 → 説明」の説明を返す
function detail(page: Page, term: string) {
  return page
    .locator("dt", { hasText: new RegExp(`^${term}$`) })
    .locator("xpath=following-sibling::dd[1]");
}

test("登録すると詳細の画面に移り、一覧に準備中で出る", async ({ page }) => {
  await loginAsOperator(page);
  const name = uniqueName("炎の剣士");

  await page.goto("/npc-avatars/new");
  await page.getByLabel("名前").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page).toHaveURL(/\/npc-avatars\/[0-9a-f-]{36}$/);
  await expect(detail(page, "状態")).toHaveText("準備中");
  await expect(async () => {
    await page.goto(`/npc-avatars?name=${encodeURIComponent(name)}`);
    await expect(avatarRows(page)).toHaveCount(1, { timeout: 1_000 });
  }).toPass();
  await expect(avatarRows(page).first()).toContainText(name);
  await expect(avatarRows(page).first()).toContainText("準備中");
});

test("使われている名前で登録すると名前の重複が表示され、入力した値が残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("森の番人");
  await createNpcAvatar(page, name);

  await page.goto("/npc-avatars/new");
  await page.getByLabel("名前").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();

  await expect(page.getByText("この名前はすでに使われています")).toBeVisible();
  await expect(page.getByLabel("名前")).toHaveValue(name);
});

test("名前を変えると詳細の見出しと入力欄が新しい名前になる", async ({
  page,
}) => {
  await loginAsOperator(page);
  await page.goto(await createNpcAvatar(page, uniqueName("見習い")));
  const renamed = uniqueName("魔術師");

  const rename = section(page, "名前の変更");
  await rename.getByLabel("名前").fill(renamed);
  await rename.getByRole("button", { name: "名前を変える" }).click();

  await expect(rename.getByText("名前を変えました")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(renamed);
  await expect(rename.getByLabel("名前")).toHaveValue(renamed);
});

test("公開すると変更と削除ができなくなり、使用不可にすると公開し直せる", async ({
  page,
}) => {
  await loginAsOperator(page);
  await page.goto(
    await createPublishableNpcAvatar(page, uniqueName("炎の剣士")),
  );

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

test("公開中の NPC のデッキを探して割り当てると使うデッキと一覧に出て、外すと消える", async ({
  page,
}) => {
  await loginAsOperator(page);
  const deckName = uniqueName("火・地");
  await createPublishedNpcDeck(page, deckName);
  const avatarName = uniqueName("森の番人");
  const avatarURL = await createNpcAvatar(page, avatarName);
  const decks = section(page, "使うデッキ");
  const candidates = section(page, "デッキを探す");
  await expect(async () => {
    await page.goto(`${avatarURL}?name=${encodeURIComponent(deckName)}`);
    await expect(
      candidates.getByRole("button", { name: `${deckName}を割り当てる` }),
    ).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await expect(decks.getByText("デッキを割り当てていません")).toBeVisible();

  await candidates
    .getByRole("button", { name: `${deckName}を割り当てる` })
    .click();

  // 押したボタンの行は「割り当て済み」に置き換わり、ボタンの知らせも消えるため、使うデッキの表に出たことで確かめる
  await expect(decks.locator("tbody tr")).toHaveCount(1);
  await expect(decks.locator("tbody tr").first()).toContainText(deckName);
  await expect(candidates.getByText("割り当て済み")).toBeVisible();
  await page.goto(`/npc-avatars?name=${encodeURIComponent(avatarName)}`);
  await expect(avatarRows(page).first()).toContainText(deckName);
  await page.goto(avatarURL);

  await decks.getByRole("button", { name: `${deckName}を外す` }).click();

  await expect(decks.getByText("デッキを割り当てていません")).toBeVisible();
  await expect(
    candidates.getByRole("button", { name: `${deckName}を割り当てる` }),
  ).toBeVisible();
});

test("デッキを割り当てていない NPC のアバターを公開しようとすると、割り当ての誤りが出て準備中のまま", async ({
  page,
}) => {
  await loginAsOperator(page);
  await page.goto(await createNpcAvatar(page, uniqueName("見習い")));

  await section(page, "公開").getByRole("button", { name: "公開する" }).click();

  await expect(
    section(page, "公開").getByText(
      "使うデッキを割り当ててから公開してください",
    ),
  ).toBeVisible();
  await expect(detail(page, "状態")).toHaveText("準備中");
});

test("状態で絞り込むと、その状態の NPC のアバターだけが出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("森の番人");
  await createNpcAvatar(page, name);
  await expect(async () => {
    await page.goto(`/npc-avatars?name=${encodeURIComponent(name)}`);
    await expect(avatarRows(page)).toHaveCount(1, { timeout: 1_000 });
  }).toPass();

  await page.getByLabel("公開中").check();
  await page.getByRole("button", { name: "絞り込む" }).click();
  await expect(page).toHaveURL(/status=PUBLISHED/);
  await expect(page.getByText("NPC のアバターがありません")).toBeVisible();

  await page.getByLabel("公開中").uncheck();
  await page.getByLabel("準備中").check();
  await page.getByRole("button", { name: "絞り込む" }).click();
  await expect(page).toHaveURL(/status=DRAFT/);
  await expect(avatarRows(page)).toHaveCount(1);
  await expect(avatarRows(page).first()).toContainText(name);
});

test("削除を確かめてから削除すると一覧の画面に移り、詳細は見つからなくなる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("見習い");
  const avatarURL = await createNpcAvatar(page, name);
  await page.goto(avatarURL);

  const del = section(page, "削除");
  await del.getByRole("button", { name: "削除する" }).click();
  await expect(
    del.getByText(`「${name}」を削除します。よろしいですか？`),
  ).toBeVisible();
  await del.getByRole("button", { name: "削除する" }).click();

  await expect(page).toHaveURL(/\/npc-avatars$/);
  await expect(async () => {
    await page.goto(avatarURL);
    await expect(
      page.getByText("この NPC のアバターは見つかりません"),
    ).toBeVisible({ timeout: 1_000 });
  }).toPass();
});

test("ほかの画面で先に公開されていると、名前は変わらず、最新の状態に切り替わって変更の欄が無くなる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("炎の剣士");
  const avatarURL = await createPublishableNpcAvatar(page, name);
  await page.goto(avatarURL);
  const other = await page.context().newPage();
  await other.goto(avatarURL);
  await expect(other.getByRole("heading", { level: 1 })).toHaveText(name);
  const publish = section(page, "公開");
  await publish.getByRole("button", { name: "公開する" }).click();
  await expect(publish.getByText("公開しました")).toBeVisible();

  const stale = section(other, "名前の変更");
  await stale.getByLabel("名前").fill(uniqueName("森の番人"));
  await stale.getByRole("button", { name: "名前を変える" }).click();

  // 公開すると revision が進むため、先に変えられたことになり、出し直した画面は公開中のものになる
  await expect(detail(other, "状態")).toHaveText("公開中");
  await expect(stale).toHaveCount(0);
  await expect(other.getByRole("heading", { level: 1 })).toHaveText(name);
});
