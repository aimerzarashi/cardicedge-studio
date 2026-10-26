import type { Page } from "@playwright/test";
import { login, signUpAndVerify } from "./account";
import {
  loginAsOperator,
  openCardRow,
  publishCard,
  registerCreature,
  registerItem,
  registerSpell,
  retireCard,
  uniqueName,
} from "./card";
import { expect, test } from "./fixtures";

function cardRows(page: Page) {
  return page.locator("tbody tr");
}

test("登録したクリーチャーがカードの一覧に出る", async ({ page }) => {
  await loginAsOperator(page);
  const name = uniqueName("ドラゴン");

  await registerCreature(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();
  await expect(page.getByLabel("カード名")).toHaveValue("");

  // 一覧は投影されてから出るため、出るまで開き直す
  await expect(async () => {
    await page.goto(`/cards?name=${encodeURIComponent(name)}`);
    await expect(cardRows(page)).toHaveCount(1);
  }).toPass();
  await expect(cardRows(page).first()).toContainText(name);
  await expect(cardRows(page).first()).toContainText("クリーチャー");
});

test("使われているカード名で登録すると名前の重複が表示され、入力した値が残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("ゴブリン");
  await registerCreature(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();

  await registerCreature(page, name);

  // getByRole("alert") は Next.js のルート読み上げ用の要素にも一致するため、文言で探す
  await expect(
    page.getByText("このカード名はすでに使われています"),
  ).toBeVisible();
  await expect(page.getByLabel("カード名")).toHaveValue(name);
});

test("登録したアイテムがカードの一覧にアイテムとして出る", async ({ page }) => {
  await loginAsOperator(page);
  const name = uniqueName("ポーション");

  await registerItem(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();
  await expect(page.getByLabel("カード名")).toHaveValue("");

  await expect(async () => {
    await page.goto(`/cards?name=${encodeURIComponent(name)}`);
    await expect(cardRows(page)).toHaveCount(1);
  }).toPass();
  await expect(cardRows(page).first()).toContainText(name);
  await expect(cardRows(page).first()).toContainText("アイテム");
});

test("使われているカード名でアイテムを登録すると名前の重複が表示され、入力した値が残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("エーテル");
  await registerItem(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();

  await registerItem(page, name);

  await expect(
    page.getByText("このカード名はすでに使われています"),
  ).toBeVisible();
  await expect(page.getByLabel("カード名")).toHaveValue(name);
});

test("クリーチャーと同じカード名でアイテムを登録すると名前の重複が表示される", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("ドラゴン");
  await registerCreature(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();

  await registerItem(page, name);

  await expect(
    page.getByText("このカード名はすでに使われています"),
  ).toBeVisible();
});

test("登録したスペルがカードの一覧にスペルとして出る", async ({ page }) => {
  await loginAsOperator(page);
  const name = uniqueName("ファイアボール");

  await registerSpell(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();
  await expect(page.getByLabel("カード名")).toHaveValue("");

  await expect(async () => {
    await page.goto(`/cards?name=${encodeURIComponent(name)}`);
    await expect(cardRows(page)).toHaveCount(1);
  }).toPass();
  await expect(cardRows(page).first()).toContainText(name);
  await expect(cardRows(page).first()).toContainText("スペル");
});

test("使われているカード名でスペルを登録すると名前の重複が表示され、入力した値が残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("メテオ");
  await registerSpell(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();

  await registerSpell(page, name);

  await expect(
    page.getByText("このカード名はすでに使われています"),
  ).toBeVisible();
  await expect(page.getByLabel("カード名")).toHaveValue(name);
});

for (const { other, register } of [
  { other: "クリーチャー", register: registerCreature },
  { other: "アイテム", register: registerItem },
]) {
  test(`${other}と同じカード名でスペルを登録すると名前の重複が表示される`, async ({
    page,
  }) => {
    await loginAsOperator(page);
    const name = uniqueName("ドラゴン");
    await register(page, name);
    await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();

    await registerSpell(page, name);

    await expect(
      page.getByText("このカード名はすでに使われています"),
    ).toBeVisible();
  });
}

for (const { condition, value, message } of [
  {
    condition: "空白だけ",
    value: " ",
    message: "カード名を入力してください",
  },
  {
    condition: "51 文字",
    value: "あ".repeat(51),
    // 上限は studio に書き写さず、core が返した値を表示する
    message: "カード名は 50 文字以内で入力してください",
  },
]) {
  test(`カード名が${condition}だと入力の誤りが表示され、入力した値が残る`, async ({
    page,
  }) => {
    await loginAsOperator(page);

    await registerCreature(page, value);

    await expect(page.getByText(message)).toBeVisible();
    await expect(page.getByLabel("カード名")).toHaveValue(value);
  });
}

test("core に登録されていないアカウントでは、登録も一覧も権限がないと表示される", async ({
  page,
  request,
}) => {
  const email = `not-operator-${crypto.randomUUID()}@example.com`;
  const password = "not-operator-password";
  await signUpAndVerify(page, request, email, password);
  await login(page, email, password);
  await expect(page).toHaveURL(/\/$/);

  await registerCreature(page, uniqueName("スライム"));
  await expect(page.getByText("この操作をする権限がありません")).toBeVisible();

  await page.goto("/cards");
  await expect(page.getByText("この操作をする権限がありません")).toBeVisible();
});

test("名前で絞り込むと、その文字を含むカードだけが出る", async ({ page }) => {
  await loginAsOperator(page);
  const id = crypto.randomUUID().slice(0, 8);
  await registerCreature(page, `a-${id}`);
  await expect(page.getByText(`「a-${id}」を登録しました`)).toBeVisible();
  await registerCreature(page, `b-${id}`);
  await expect(page.getByText(`「b-${id}」を登録しました`)).toBeVisible();

  await expect(async () => {
    await page.goto("/cards");
    await page.getByLabel("名前").fill(id);
    await page.getByRole("button", { name: "絞り込む" }).click();
    await expect(cardRows(page)).toHaveCount(2);
  }).toPass();
  await expect(cardRows(page).nth(0)).toContainText(`a-${id}`);
  await expect(cardRows(page).nth(1)).toContainText(`b-${id}`);
  // 条件は URL に持つ
  await expect(page).toHaveURL(new RegExp(`name=${id}`));
});

test("登録したカードは準備中で、公開すると公開中、使用不可にすると使用不可になり、公開し直せる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("ドラゴン");
  await registerCreature(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();
  const row = await openCardRow(page, name);
  await expect(row).toContainText("準備中");
  await expect(
    row.getByRole("button", { name: `${name}を使用不可にする` }),
  ).toHaveCount(0);

  await publishCard(page, name);
  await expect(
    row.getByRole("button", { name: `${name}を使用不可にする` }),
  ).toBeVisible();

  await retireCard(page, name);
  await expect(
    row.getByRole("button", { name: `${name}を公開する` }),
  ).toBeVisible();

  await publishCard(page, name);
});

test("状態で絞り込むと、その状態のカードだけが出る", async ({ page }) => {
  await loginAsOperator(page);
  const id = crypto.randomUUID().slice(0, 8);
  await registerCreature(page, `a-${id}`);
  await expect(page.getByText(`「a-${id}」を登録しました`)).toBeVisible();
  await registerCreature(page, `b-${id}`);
  await expect(page.getByText(`「b-${id}」を登録しました`)).toBeVisible();
  await publishCard(page, `b-${id}`);

  await page.goto(`/cards?name=${id}`);
  await page.getByLabel("公開中").check();
  await page.getByRole("button", { name: "絞り込む" }).click();

  // 条件は URL に持つ
  await expect(page).toHaveURL(/status=PUBLISHED/);
  await expect(cardRows(page)).toHaveCount(1);
  await expect(cardRows(page).first()).toContainText(`b-${id}`);

  await page.getByLabel("公開中").uncheck();
  await page.getByLabel("準備中").check();
  await page.getByRole("button", { name: "絞り込む" }).click();
  await expect(cardRows(page)).toHaveCount(1);
  await expect(cardRows(page).first()).toContainText(`a-${id}`);
});

test("ほかの画面で先に公開されていると、変えずに最新の状態を表示して知らせる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("ドラゴン");
  await registerCreature(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();
  const row = await openCardRow(page, name);
  const other = await page.context().newPage();
  const otherRow = await openCardRow(other, name);
  await publishCard(page, name);

  await otherRow.getByRole("button", { name: `${name}を公開する` }).click();

  await expect(
    otherRow.getByText("ほかの操作で変わっていたため、変えませんでした"),
  ).toBeVisible();
  await expect(otherRow).toContainText("公開中");
  await expect(row).toContainText("公開中");
});
