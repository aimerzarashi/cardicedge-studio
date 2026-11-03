import type { Page } from "@playwright/test";
import { createPublishedBoard } from "./board";
import { loginAsOperator, uniqueName } from "./card";
import { expect, test } from "./fixtures";
import { createPublishedGrantDeck } from "./grant-deck";
import { createPublishedNpcAvatar } from "./npc-avatar";
import { section } from "./preset-deck";
import { createStarterSet } from "./starter-set";

// 公開中にできるスターターセットは同時に 1 つで、core の DB を共有するため、公開するテストは公開したまま終わらない
// （使用不可にして終える）。公開するテストは同じファイルの中で順に流れる（fullyParallel にしていないため）。
// 前準備のスターターセット・配るデッキ・ボード・NPC のアバターは GraphQL で入れ（tests/starter-set.ts ほか）、確かめる画面の操作だけを画面でする。
// 画面で登録する流れは、1 本目のテストで確かめている。名前は 20 文字までのため、uniqueName の元は短くする

function setRows(page: Page) {
  return page.locator("tbody tr");
}

// 詳細の「用語 → 説明」の説明を返す
function detail(page: Page, term: string) {
  return page
    .locator("dt", { hasText: new RegExp(`^${term}$`) })
    .locator("xpath=following-sibling::dd[1]");
}

// 公開中・使用不可にして終えるための後始末
async function retire(page: Page, setURL: string) {
  await page.goto(setURL);
  await section(page, "公開")
    .getByRole("button", { name: "使用不可にする" })
    .click();
  await expect(detail(page, "状態")).toHaveText("使用不可");
}

// 配るデッキを 1 つ割り当てた（公開できる）スターターセットの詳細の URL（パス）を、画面で割り当てて作る
async function createPublishableStarterSet(page: Page, name: string) {
  const deckName = uniqueName("火・地");
  await createPublishedGrantDeck(page, deckName);
  const setURL = await createStarterSet(page, name);
  const candidates = section(page, "デッキを探す");
  await expect(async () => {
    await page.goto(`${setURL}?deckName=${encodeURIComponent(deckName)}`);
    await expect(
      candidates.getByRole("button", { name: `${deckName}を割り当てる` }),
    ).toBeVisible({ timeout: 1_000 });
  }).toPass();
  await candidates
    .getByRole("button", { name: `${deckName}を割り当てる` })
    .click();
  await expect(section(page, "配るデッキ").locator("tbody tr")).toHaveCount(1);
  return setURL;
}

test("登録すると詳細の画面に移り、一覧に準備中で出る", async ({ page }) => {
  await loginAsOperator(page);
  const name = uniqueName("新人向け");

  await page.goto("/starter-sets/new");
  await page.getByLabel("名前").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page).toHaveURL(/\/starter-sets\/[0-9a-f-]{36}$/);
  await expect(detail(page, "状態")).toHaveText("準備中");
  await expect(async () => {
    await page.goto(`/starter-sets?name=${encodeURIComponent(name)}`);
    await expect(setRows(page)).toHaveCount(1, { timeout: 1_000 });
  }).toPass();
  await expect(setRows(page).first()).toContainText(name);
  await expect(setRows(page).first()).toContainText("準備中");
});

test("使われている名前で登録すると名前の重複が表示され、入力した値が残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("新人向け");
  await createStarterSet(page, name);

  await page.goto("/starter-sets/new");
  await page.getByLabel("名前").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();

  await expect(page.getByText("この名前はすでに使われています")).toBeVisible();
  await expect(page.getByLabel("名前")).toHaveValue(name);
});

test("名前を変えると詳細の見出しと入力欄が新しい名前になる", async ({
  page,
}) => {
  await loginAsOperator(page);
  await page.goto(await createStarterSet(page, uniqueName("新人向け")));
  const renamed = uniqueName("復帰向け");

  const rename = section(page, "名前の変更");
  await rename.getByLabel("名前").fill(renamed);
  await rename.getByRole("button", { name: "名前を変える" }).click();

  await expect(rename.getByText("名前を変えました")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(renamed);
  await expect(rename.getByLabel("名前")).toHaveValue(renamed);
});

test("配るデッキ・解放するボード・解放する NPC を探して割り当てると表と一覧に出て、外すと消える", async ({
  page,
}) => {
  await loginAsOperator(page);
  const deckName = uniqueName("火・地");
  const boardName = uniqueName("初級盤");
  const npcName = uniqueName("森の番人");
  await createPublishedGrantDeck(page, deckName);
  await createPublishedBoard(page, boardName);
  await createPublishedNpcAvatar(page, npcName);
  const setName = uniqueName("新人向け");
  const setURL = await createStarterSet(page, setName);
  const search = new URLSearchParams({ deckName, boardName, npcName });
  const targets = [
    { assigned: "配るデッキ", find: "デッキを探す", name: deckName },
    { assigned: "解放するボード", find: "ボードを探す", name: boardName },
    { assigned: "解放する NPC", find: "NPC を探す", name: npcName },
  ];
  // 一覧は投影から読むため、3 つとも出るまで開き直す
  await expect(async () => {
    await page.goto(`${setURL}?${search}`);
    for (const { find, name } of targets) {
      await expect(
        section(page, find).getByRole("button", {
          name: `${name}を割り当てる`,
        }),
      ).toBeVisible({ timeout: 1_000 });
    }
  }).toPass();

  for (const { assigned, find, name } of targets) {
    await expect(
      section(page, assigned).getByText("割り当てていません"),
    ).toBeVisible();
    await section(page, find)
      .getByRole("button", { name: `${name}を割り当てる` })
      .click();
    // 押したボタンの行は「割り当て済み」に置き換わり、ボタンの知らせも消えるため、割り当てた表に出たことで確かめる
    await expect(section(page, assigned).locator("tbody tr")).toHaveCount(1);
    await expect(section(page, assigned).locator("tbody tr")).toContainText(
      name,
    );
    await expect(section(page, find).getByText("割り当て済み")).toBeVisible();
  }
  await page.goto(`/starter-sets?name=${encodeURIComponent(setName)}`);
  await expect(setRows(page).first()).toContainText(deckName);
  await expect(setRows(page).first()).toContainText(boardName);
  await expect(setRows(page).first()).toContainText(npcName);
  await page.goto(`${setURL}?${search}`);

  for (const { assigned, find, name } of targets) {
    await section(page, assigned)
      .getByRole("button", { name: `${name}を外す` })
      .click();
    await expect(
      section(page, assigned).getByText("割り当てていません"),
    ).toBeVisible();
    await expect(
      section(page, find).getByRole("button", { name: `${name}を割り当てる` }),
    ).toBeVisible();
  }
});

test("公開すると変更と削除ができなくなり、使用不可にすると公開し直せる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const setURL = await createPublishableStarterSet(
    page,
    uniqueName("新人向け"),
  );
  try {
    const publish = section(page, "公開");
    await publish.getByRole("button", { name: "公開する" }).click();
    await expect(publish.getByText("公開しました")).toBeVisible();
    await expect(detail(page, "状態")).toHaveText("公開中");
    await expect(section(page, "名前の変更")).toHaveCount(0);
    await expect(section(page, "削除")).toHaveCount(0);
    // 公開後は割り当てた中身を見られるだけで、外す・探す欄は無い
    await expect(section(page, "配るデッキ").locator("tbody tr")).toHaveCount(
      1,
    );
    await expect(section(page, "配るデッキ").getByRole("button")).toHaveCount(
      0,
    );
    await expect(section(page, "デッキを探す")).toHaveCount(0);

    await publish.getByRole("button", { name: "使用不可にする" }).click();
    await expect(publish.getByText("使用不可にしました")).toBeVisible();
    await expect(detail(page, "状態")).toHaveText("使用不可");

    await publish.getByRole("button", { name: "公開する" }).click();
    await expect(detail(page, "状態")).toHaveText("公開中");
  } finally {
    await retire(page, setURL);
  }
});

test("ほかに公開中のスターターセットがあると、上限の数が出て準備中のまま", async ({
  page,
}) => {
  await loginAsOperator(page);
  const first = await createPublishableStarterSet(page, uniqueName("新人向け"));
  const second = await createPublishableStarterSet(
    page,
    uniqueName("復帰向け"),
  );
  try {
    await page.goto(first);
    const publishFirst = section(page, "公開");
    await publishFirst.getByRole("button", { name: "公開する" }).click();
    await expect(publishFirst.getByText("公開しました")).toBeVisible();

    await page.goto(second);
    const publish = section(page, "公開");
    await publish.getByRole("button", { name: "公開する" }).click();
    await expect(
      publish.getByText(
        "公開中のスターターセットは 1 個までです。今のものを使用不可にすると公開できます",
      ),
    ).toBeVisible();
    await expect(detail(page, "状態")).toHaveText("準備中");
  } finally {
    await retire(page, first);
  }
});

test("配るデッキを割り当てていないスターターセットを公開しようとすると、割り当ての誤りが出て準備中のまま", async ({
  page,
}) => {
  await loginAsOperator(page);
  await page.goto(await createStarterSet(page, uniqueName("新人向け")));

  await section(page, "公開").getByRole("button", { name: "公開する" }).click();

  await expect(
    section(page, "公開").getByText(
      "配るデッキを割り当ててから公開してください",
    ),
  ).toBeVisible();
  await expect(detail(page, "状態")).toHaveText("準備中");
});

test("状態で絞り込むと、その状態のスターターセットだけが出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("新人向け");
  await createStarterSet(page, name);
  await expect(async () => {
    await page.goto(`/starter-sets?name=${encodeURIComponent(name)}`);
    await expect(setRows(page)).toHaveCount(1, { timeout: 1_000 });
  }).toPass();

  await page.getByLabel("公開中").check();
  await page.getByRole("button", { name: "絞り込む" }).click();
  await expect(page).toHaveURL(/status=PUBLISHED/);
  await expect(page.getByText("スターターセットがありません")).toBeVisible();

  await page.getByLabel("公開中").uncheck();
  await page.getByLabel("準備中").check();
  await page.getByRole("button", { name: "絞り込む" }).click();
  await expect(page).toHaveURL(/status=DRAFT/);
  await expect(setRows(page)).toHaveCount(1);
  await expect(setRows(page).first()).toContainText(name);
});

test("削除を確かめてから削除すると一覧の画面に移り、詳細は見つからなくなる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("新人向け");
  const setURL = await createStarterSet(page, name);
  await page.goto(setURL);

  const del = section(page, "削除");
  await del.getByRole("button", { name: "削除する" }).click();
  await expect(
    del.getByText(`「${name}」を削除します。よろしいですか？`),
  ).toBeVisible();
  await del.getByRole("button", { name: "削除する" }).click();

  await expect(page).toHaveURL(/\/starter-sets$/);
  await expect(async () => {
    await page.goto(setURL);
    await expect(
      page.getByText("このスターターセットは見つかりません"),
    ).toBeVisible({ timeout: 1_000 });
  }).toPass();
});

test("ほかの画面で先に公開されていると、名前は変わらず、最新の状態に切り替わって変更の欄が無くなる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("新人向け");
  const setURL = await createPublishableStarterSet(page, name);
  try {
    await page.goto(setURL);
    const other = await page.context().newPage();
    await other.goto(setURL);
    await expect(other.getByRole("heading", { level: 1 })).toHaveText(name);
    const publish = section(page, "公開");
    await publish.getByRole("button", { name: "公開する" }).click();
    await expect(publish.getByText("公開しました")).toBeVisible();

    const stale = section(other, "名前の変更");
    await stale.getByLabel("名前").fill(uniqueName("復帰向け"));
    await stale.getByRole("button", { name: "名前を変える" }).click();

    // 公開すると revision が進むため、先に変えられたことになり、出し直した画面は公開中のものになる
    await expect(detail(other, "状態")).toHaveText("公開中");
    await expect(stale).toHaveCount(0);
    await expect(other.getByRole("heading", { level: 1 })).toHaveText(name);
  } finally {
    await retire(page, setURL);
  }
});
