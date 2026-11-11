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

test("準備中のカードの詳細でコストと希少度を変えると、詳細と一覧に出る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("スペクター");
  await registerCreature(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();
  await (await openCardRow(page, name)).getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

  await page.getByLabel("コスト").fill("30");
  await page.getByRole("button", { name: "コストを変える" }).click();
  await expect(page.getByText("保存しました")).toBeVisible();
  await expect(page.getByLabel("コスト")).toHaveValue("30");
  await page.getByLabel("希少度").selectOption({ label: "R" });
  await page.getByRole("button", { name: "希少度を変える" }).click();
  await expect(page.getByLabel("希少度")).toHaveValue("RARE");

  // 一覧の列は カード名・種類・状態・コスト・希少度 の順
  const row = await openCardRow(page, name);
  await expect(row.locator("td").nth(3)).toHaveText("30");
  await expect(row.locator("td").nth(4)).toHaveText("R");
});

test("準備中のクリーチャーの詳細で属性と AT・HP を変えると詳細に出て、属性の組み合わせの誤りは選んだまま残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("サラマンダー");
  await registerCreature(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();
  await (await openCardRow(page, name)).getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  // 登録の直後は無属性
  await expect(page.getByLabel("無", { exact: true })).toBeChecked();

  // 無は単独でしか持てない（決まりは core が判定する）
  await page.getByLabel("火", { exact: true }).check();
  await page.getByRole("button", { name: "属性を変える" }).click();
  await expect(
    page.getByText("この属性の組み合わせにはできません"),
  ).toBeVisible();
  await expect(page.getByLabel("火", { exact: true })).toBeChecked();
  await expect(page.getByLabel("無", { exact: true })).toBeChecked();

  await page.getByLabel("無", { exact: true }).uncheck();
  await page.getByLabel("水", { exact: true }).check();
  await page.getByRole("button", { name: "属性を変える" }).click();
  await expect(page.getByText("保存しました")).toBeVisible();
  await expect(page.getByLabel("火", { exact: true })).toBeChecked();
  await expect(page.getByLabel("水", { exact: true })).toBeChecked();
  await expect(page.getByLabel("無", { exact: true })).not.toBeChecked();

  await page.getByLabel("AT", { exact: true }).fill("40");
  await page.getByLabel("HP", { exact: true }).fill("50");
  await page.getByRole("button", { name: "AT と HP を変える" }).click();
  await expect(page.getByText("保存しました").nth(1)).toBeVisible();
  await expect(page.getByLabel("AT", { exact: true })).toHaveValue("40");
  await expect(page.getByLabel("HP", { exact: true })).toHaveValue("50");

  // 移動は既定の 1 から、AT・HP とは別のボタンで変える
  await expect(page.getByLabel("移動", { exact: true })).toHaveValue("1");
  await page.getByLabel("移動", { exact: true }).fill("-1");
  await page.getByRole("button", { name: "移動を変える" }).click();
  await expect(page.getByText("移動は 0 以上にしてください")).toBeVisible();
  await page.getByLabel("移動", { exact: true }).fill("0");
  await page.getByRole("button", { name: "移動を変える" }).click();
  await expect(page.getByText("保存しました").nth(2)).toBeVisible();
  await expect(page.getByLabel("移動", { exact: true })).toHaveValue("0");

  // アイテム制限は既定で無く、チェックした分類を持てなくする
  await expect(page.getByLabel("防具", { exact: true })).not.toBeChecked();
  await page.getByLabel("防具", { exact: true }).check();
  await page.getByLabel("巻物", { exact: true }).check();
  await page.getByRole("button", { name: "アイテム制限を変える" }).click();
  await expect(page.getByText("保存しました").nth(3)).toBeVisible();
  await expect(page.getByLabel("防具", { exact: true })).toBeChecked();
  await expect(page.getByLabel("巻物", { exact: true })).toBeChecked();
  await expect(page.getByLabel("武器", { exact: true })).not.toBeChecked();
});

test("コストに 0 未満を入れると入力の誤りが表示され、入力した値が残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("ウルフ");
  await registerCreature(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();
  await (await openCardRow(page, name)).getByRole("link", { name }).click();

  await page.getByLabel("コスト").fill("-1");
  await page.getByRole("button", { name: "コストを変える" }).click();

  await expect(page.getByText("コストは 0 以上にしてください")).toBeVisible();
  await expect(page.getByLabel("コスト")).toHaveValue("-1");
});

test("公開中のカードの詳細は性能を表示だけにする", async ({ page }) => {
  await loginAsOperator(page);
  const name = uniqueName("ノーム");
  await registerCreature(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();
  await publishCard(page, name);
  await page.getByRole("link", { name }).click();

  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "コストを変える" }),
  ).toHaveCount(0);
  await expect(page.getByText("コスト", { exact: true })).toBeVisible();
});

test("ログインした後の画面からトップへ戻れる", async ({ page }) => {
  await loginAsOperator(page);
  await page.goto("/cards");

  await page
    .getByRole("navigation", { name: "全体" })
    .getByRole("link", { name: "トップへ" })
    .click();

  await expect(
    page.getByRole("heading", { level: 1, name: "studio" }),
  ).toBeVisible();
});

test("準備中のアイテムの詳細で分類と AT・HP の増減を変えると詳細に出て、負の増減も入れられる", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("かぶと");
  await registerItem(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();
  await (await openCardRow(page, name)).getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  // 登録の直後は武器で、増減は 0
  await expect(page.getByLabel("分類")).toHaveValue("WEAPON");
  await expect(page.getByLabel("AT の増減")).toHaveValue("0");
  await expect(page.getByLabel("HP の増減")).toHaveValue("0");

  await page.getByLabel("分類").selectOption("ARMOR");
  await page.getByRole("button", { name: "分類を変える" }).click();
  await expect(page.getByText("保存しました")).toBeVisible();
  await expect(page.getByLabel("分類")).toHaveValue("ARMOR");

  await page.getByLabel("AT の増減").fill("-5");
  await page.getByLabel("HP の増減").fill("30");
  await page.getByRole("button", { name: "増減を変える" }).click();
  await expect(page.getByText("保存しました").nth(1)).toBeVisible();
  await expect(page.getByLabel("AT の増減")).toHaveValue("-5");
  await expect(page.getByLabel("HP の増減")).toHaveValue("30");

  // 公開した後は表示だけで、増やす値にも + が付く
  await publishCard(page, name);
  await (await openCardRow(page, name)).getByRole("link", { name }).click();
  await expect(page.locator("dl").last()).toHaveText(
    /分類\s*防具\s*AT の増減\s*-5\s*HP の増減\s*\+30/,
  );
});

test("準備中のスペルの詳細で効果を変えると詳細に出て、引く枚数の誤りは入力したまま残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("ホープ");
  await registerSpell(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();
  // 効果の無いスペルは公開できず、理由が出る
  const row = await openCardRow(page, name);
  await row.getByRole("button", { name: `${name}を公開する` }).click();
  await expect(
    row.getByText(
      "効果の無いスペルは公開できません。カードの詳細で効果を入れてください",
    ),
  ).toBeVisible();
  await expect(row).toContainText("準備中");
  await row.getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  // 登録の直後は効果なし
  await expect(page.getByRole("combobox", { name: "効果" })).toHaveValue(
    "none",
  );

  await page.getByRole("combobox", { name: "効果" }).selectOption("drawCards");
  await page.getByLabel("値", { exact: true }).fill("0");
  await page.getByRole("button", { name: "効果を変える" }).click();
  await expect(page.getByText("引く枚数は 1 以上にしてください")).toBeVisible();
  await expect(page.getByLabel("値", { exact: true })).toHaveValue("0");
  await page.getByLabel("値", { exact: true }).fill("2");
  await page.getByRole("button", { name: "効果を変える" }).click();
  await expect(page.getByText("保存しました")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "効果" })).toHaveValue(
    "drawCards",
  );
  await expect(page.getByLabel("値", { exact: true })).toHaveValue("2");

  // 公開した後は表示だけ
  await publishCard(page, name);
  await (await openCardRow(page, name)).getByRole("link", { name }).click();
  await expect(page.locator("dl").last()).toHaveText(
    /効果\s*カードを 2 枚引く/,
  );
});
