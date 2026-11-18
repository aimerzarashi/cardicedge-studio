import type { Page } from "@playwright/test";
import { loginAsOperator, uniqueName } from "./card";
import { expect, test } from "./fixtures";
import { createNpcMindset } from "./npc-mindset";
import { section } from "./preset-deck";

// 前準備の NPC の思考パターンは GraphQL で入れ（tests/npc-mindset.ts）、確かめる画面の操作だけを画面でする。
// 画面で登録する流れは、1 本目のテストで確かめている。名前は 20 文字までのため、uniqueName の元は短くする

function mindsetRows(page: Page) {
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
  const name = uniqueName("攻めがち");

  await page.goto("/npc-mindsets/new");
  await page.getByLabel("名前").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(page).toHaveURL(/\/npc-mindsets\/[0-9a-f-]{36}$/);
  await expect(detail(page, "状態")).toHaveText("準備中");
  await expect(async () => {
    await page.goto(`/npc-mindsets?name=${encodeURIComponent(name)}`);
    await expect(mindsetRows(page)).toHaveCount(1, { timeout: 1_000 });
  }).toPass();
  await expect(mindsetRows(page).first()).toContainText(name);
  await expect(mindsetRows(page).first()).toContainText("準備中");
});

test("使われている名前で登録すると名前の重複が表示され、入力した値が残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("慎重");
  await createNpcMindset(page, name);

  await page.goto("/npc-mindsets/new");
  await page.getByLabel("名前").fill(name);
  await page.getByRole("button", { name: "登録する" }).click();

  await expect(page.getByText("この名前はすでに使われています")).toBeVisible();
  await expect(page.getByLabel("名前")).toHaveValue(name);
});

test("名前を変えると詳細の見出しと入力欄が新しい名前になる", async ({
  page,
}) => {
  await loginAsOperator(page);
  await page.goto(await createNpcMindset(page, uniqueName("ふつう")));
  const renamed = uniqueName("のんびり");

  const rename = section(page, "名前の変更");
  await rename.getByLabel("名前").fill(renamed);
  await rename.getByRole("button", { name: "名前を変える" }).click();

  await expect(rename.getByText("名前を変えました")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(renamed);
  await expect(rename.getByLabel("名前")).toHaveValue(renamed);
});

test("行動の種類ごとの重みと採点基準ごとの重みを保存すると、読み直しても保存した値が入っている", async ({
  page,
}) => {
  await loginAsOperator(page);
  await page.goto(await createNpcMindset(page, uniqueName("攻めがち")));
  const actions = section(page, "行動の種類ごとの重み");
  const criteria = section(page, "採点基準ごとの重み");
  await expect(
    actions.getByText(
      "点を付けない段階（引く・捨てる・振る前・行き先）で使います",
    ),
  ).toBeVisible();
  await expect(
    criteria.getByText("自分の総魔力と相手のうち一番高い人の差"),
  ).toBeVisible();

  await actions.getByLabel("カードを引く", { exact: true }).fill("20");
  await actions.getByLabel("サイコロを振る", { exact: true }).fill("0");
  await actions
    .getByRole("button", { name: "行動の種類の重みを保存する" })
    .click();
  await expect(actions.getByText("重みを保存しました")).toBeVisible();
  await criteria.getByLabel("領地の数", { exact: true }).fill("70");
  await criteria
    .getByRole("button", { name: "採点基準の重みを保存する" })
    .click();
  await expect(criteria.getByText("重みを保存しました")).toBeVisible();

  await page.reload();
  await expect(actions.getByLabel("カードを引く", { exact: true })).toHaveValue(
    "20",
  );
  await expect(
    actions.getByLabel("サイコロを振る", { exact: true }),
  ).toHaveValue("0");
  await expect(criteria.getByLabel("領地の数", { exact: true })).toHaveValue(
    "70",
  );
});

test("範囲外の重みを保存しようとすると、その行に範囲が出て、入力した値が残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  await page.goto(await createNpcMindset(page, uniqueName("慎重")));
  const criteria = section(page, "採点基準ごとの重み");

  await criteria.getByLabel("魔力を残す", { exact: true }).fill("101");
  await criteria
    .getByRole("button", { name: "採点基準の重みを保存する" })
    .click();

  await expect(
    criteria.getByText("重みは 0〜100 の整数にしてください"),
  ).toBeVisible();
  await expect(criteria.getByLabel("魔力を残す", { exact: true })).toHaveValue(
    "101",
  );
  await expect(
    criteria.getByLabel("魔力を残す", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
});

test("公開すると変更と削除ができなくなり、使用不可にすると公開し直せる", async ({
  page,
}) => {
  await loginAsOperator(page);
  await page.goto(await createNpcMindset(page, uniqueName("ふつう")));

  const publish = section(page, "公開");
  await publish.getByRole("button", { name: "公開する" }).click();
  await expect(publish.getByText("公開しました")).toBeVisible();
  await expect(detail(page, "状態")).toHaveText("公開中");
  await expect(section(page, "名前の変更")).toHaveCount(0);
  await expect(section(page, "削除")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "行動の種類の重みを保存する" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("公開中・使用不可の NPC の思考パターンは変えられません"),
  ).toBeVisible();

  await publish.getByRole("button", { name: "使用不可にする" }).click();
  await expect(publish.getByText("使用不可にしました")).toBeVisible();
  await expect(detail(page, "状態")).toHaveText("使用不可");

  await publish.getByRole("button", { name: "公開する" }).click();
  await expect(detail(page, "状態")).toHaveText("公開中");
});

test("状態で絞り込むと、その状態の NPC の思考パターンだけが出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("慎重");
  await createNpcMindset(page, name);
  await expect(async () => {
    await page.goto(`/npc-mindsets?name=${encodeURIComponent(name)}`);
    await expect(mindsetRows(page)).toHaveCount(1, { timeout: 1_000 });
  }).toPass();

  await page.getByLabel("公開中").check();
  await page.getByRole("button", { name: "絞り込む" }).click();
  await expect(page).toHaveURL(/status=PUBLISHED/);
  await expect(page.getByText("NPC の思考パターンがありません")).toBeVisible();

  await page.getByLabel("公開中").uncheck();
  await page.getByLabel("準備中").check();
  await page.getByRole("button", { name: "絞り込む" }).click();
  await expect(page).toHaveURL(/status=DRAFT/);
  await expect(mindsetRows(page)).toHaveCount(1);
  await expect(mindsetRows(page).first()).toContainText(name);
});

test("削除を確かめてから削除すると一覧の画面に移り、詳細は見つからなくなる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("ふつう");
  const mindsetURL = await createNpcMindset(page, name);
  await page.goto(mindsetURL);

  const del = section(page, "削除");
  await del.getByRole("button", { name: "削除する" }).click();
  await expect(
    del.getByText(`「${name}」を削除します。よろしいですか？`),
  ).toBeVisible();
  await del.getByRole("button", { name: "削除する" }).click();

  await expect(page).toHaveURL(/\/npc-mindsets$/);
  await expect(async () => {
    await page.goto(mindsetURL);
    await expect(
      page.getByText("この NPC の思考パターンは見つかりません"),
    ).toBeVisible({ timeout: 1_000 });
  }).toPass();
});
