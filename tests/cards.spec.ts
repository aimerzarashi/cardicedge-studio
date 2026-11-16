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

test("準備中のクリーチャーの詳細で属性・AT と HP・制限・効果を変えると詳細に出て、誤りは入力したまま残る", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("サラマンダー");
  await registerCreature(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();
  await (await openCardRow(page, name)).getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  const elements = page.getByRole("group", { name: "属性", exact: true });
  // 登録の直後は無属性
  await expect(elements.getByLabel("無", { exact: true })).toBeChecked();

  // 無は単独でしか持てない（決まりは core が判定する）
  await elements.getByLabel("火", { exact: true }).check();
  await page.getByRole("button", { name: "属性を変える" }).click();
  await expect(
    page.getByText("この属性の組み合わせにはできません"),
  ).toBeVisible();
  await expect(elements.getByLabel("火", { exact: true })).toBeChecked();
  await expect(elements.getByLabel("無", { exact: true })).toBeChecked();

  await elements.getByLabel("無", { exact: true }).uncheck();
  await elements.getByLabel("水", { exact: true }).check();
  await page.getByRole("button", { name: "属性を変える" }).click();
  await expect(page.getByText("保存しました")).toBeVisible();
  await expect(elements.getByLabel("火", { exact: true })).toBeChecked();
  await expect(elements.getByLabel("水", { exact: true })).toBeChecked();
  await expect(elements.getByLabel("無", { exact: true })).not.toBeChecked();

  await page.getByLabel("AT", { exact: true }).fill("40");
  await page.getByLabel("HP", { exact: true }).fill("50");
  await page.getByRole("button", { name: "AT と HP を変える" }).click();
  await expect(page.getByText("保存しました").nth(1)).toBeVisible();
  await expect(page.getByLabel("AT", { exact: true })).toHaveValue("40");
  await expect(page.getByLabel("HP", { exact: true })).toHaveValue("50");

  // アイテム制限は既定で無く、チェックした分類を持てなくする
  await expect(page.getByLabel("防具", { exact: true })).not.toBeChecked();
  await page.getByLabel("防具", { exact: true }).check();
  await page.getByLabel("巻物", { exact: true }).check();
  await page.getByRole("button", { name: "アイテム制限を変える" }).click();
  await expect(page.getByText("保存しました").nth(2)).toBeVisible();
  await expect(page.getByLabel("防具", { exact: true })).toBeChecked();
  await expect(page.getByLabel("巻物", { exact: true })).toBeChecked();
  await expect(page.getByLabel("武器", { exact: true })).not.toBeChecked();

  // 配置制限は既定で無く、チェックした属性の土地に置けなくする（無は選べない）
  const placement = page.getByRole("group", { name: /^配置制限/ });
  await expect(placement.getByLabel("無", { exact: true })).toHaveCount(0);
  await placement.getByLabel("地", { exact: true }).check();
  await placement.getByLabel("風", { exact: true }).check();
  await page.getByRole("button", { name: "配置制限を変える" }).click();
  await expect(page.getByText("保存しました").nth(3)).toBeVisible();
  await expect(placement.getByLabel("地", { exact: true })).toBeChecked();
  await expect(placement.getByLabel("火", { exact: true })).not.toBeChecked();

  // 効果はアイテムと同じ部品で、クリーチャーが持てる種類（core の allowedEffectKinds）だけを出す（core#178）
  await expect(
    page.getByLabel("地形効果を無視する", { exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("侵略できない", { exact: true }).check();
  await page.getByLabel("移動できない", { exact: true }).check();
  await page.getByRole("button", { name: "効果を変える" }).click();
  await expect(page.getByText("保存しました").nth(4)).toBeVisible();
  await expect(page.getByLabel("侵略できない", { exact: true })).toBeChecked();

  // 値の要る効果は、範囲の誤りが文言で出て入力が残る
  await page.getByLabel("通行料の倍率", { exact: true }).check();
  await page.getByLabel("通行料の倍率（%）").fill("0");
  await page.getByRole("button", { name: "効果を変える" }).click();
  await expect(
    page.getByText("通行料の倍率（%）は 1 以上にしてください"),
  ).toBeVisible();
  await expect(page.getByLabel("通行料の倍率（%）")).toHaveValue("0");
  await page.getByLabel("通行料の倍率（%）").fill("150");

  // HP の増減は負も保存できる。上書きは範囲で、最大が最小より小さいと誤りが文言で出て入力が残る
  await page.getByLabel("HP の増減", { exact: true }).check();
  await page.getByLabel("HP の増減の値").fill("-20");
  await page.getByLabel("HP の上書き", { exact: true }).check();
  await page.getByLabel("上書きした後の HP の最小").fill("70");
  await page.getByLabel("上書きした後の HP の最大").fill("10");
  await page.getByRole("button", { name: "効果を変える" }).click();
  await expect(
    page.getByText("上書きした後の HP の最大は 70 以上にしてください"),
  ).toBeVisible();
  await expect(page.getByLabel("上書きした後の HP の最大")).toHaveValue("10");
  await page.getByLabel("上書きした後の HP の最小").fill("10");
  await page.getByLabel("上書きした後の HP の最大").fill("70");

  // 先制と後手は一緒に選べず、誤りが文言で出て選んだものが残る
  await page.getByLabel("先制（先に攻撃する）", { exact: true }).check();
  await page.getByLabel("後手（後に攻撃する）", { exact: true }).check();
  await page.getByRole("button", { name: "効果を変える" }).click();
  await expect(page.getByText("先制と後手は一緒に選べません")).toBeVisible();
  await expect(
    page.getByLabel("後手（後に攻撃する）", { exact: true }),
  ).toBeChecked();
  await page.getByLabel("後手（後に攻撃する）", { exact: true }).uncheck();

  // 攻撃無効は相手の属性を制約にする（無も選べる）
  await page
    .getByLabel("攻撃無効（受けるダメージを 0 にする）", { exact: true })
    .check();
  const immunity = page.getByRole("group", {
    name: /攻撃無効にする相手の属性/,
  });
  await expect(immunity.getByLabel("無", { exact: true })).toHaveCount(1);
  await immunity.getByLabel("地", { exact: true }).check();
  await immunity.getByLabel("火", { exact: true }).check();

  // 破壊されたときの効果は、発動する破壊を 1 つ以上選ぶ（選ばなければ文言が出て、入力が残る。core#182）
  await page.getByLabel("破壊されたら魔力を得る", { exact: true }).check();
  await page.getByLabel("受け取る魔力の額").fill("200");
  await page.getByRole("button", { name: "効果を変える" }).click();
  await expect(
    page.getByText("発動する破壊を 1 つ以上選んでください"),
  ).toBeVisible();
  await expect(page.getByLabel("受け取る魔力の額")).toHaveValue("200");
  const destructions = page.getByRole("group", {
    name: /魔力を得る破壊/,
  });
  await destructions.getByLabel("守るとき", { exact: true }).check();
  await destructions.getByLabel("ボード", { exact: true }).check();
  await page.getByRole("button", { name: "効果を変える" }).click();
  await expect(page.getByText("保存しました").nth(4)).toBeVisible();
  await expect(
    page.getByLabel("先制（先に攻撃する）", { exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel("上書きした後の HP の最大")).toHaveValue("70");
  await expect(immunity.getByLabel("火", { exact: true })).toBeChecked();

  // 公開すると、効果は core の並び（選択肢の順）で表示に出る
  await publishCard(page, name);
  // 一覧にも、属性・AT・HP と、持っている制限・効果が出る（studio#73）
  await expect((await openCardRow(page, name)).getByRole("cell")).toContainText(
    [
      "水",
      "40",
      "50",
      "アイテム制限 防具・巻物／配置制限 地風／HP -20・HP を 10〜70 に上書き・先制・攻撃無効（相手が火地）・通行料の倍率 150%・侵略できない・移動できない・破壊されたら魔力 +200（守るとき・ボード）",
    ],
  );
  await page.getByRole("link", { name }).click();
  await expect(
    page.getByText(
      "HP -20・HP を 10〜70 に上書き・先制・攻撃無効（相手が火地）・通行料の倍率 150%・侵略できない・移動できない・破壊されたら魔力 +200（守るとき・ボード）",
    ),
  ).toBeVisible();
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

test("準備中のアイテムの詳細で分類と効果を変えると詳細に出て、今の効果を持てない分類には変えられない", async ({
  page,
}) => {
  await loginAsOperator(page);
  const name = uniqueName("まきもの");
  await registerItem(page, name);
  await expect(page.getByText(`「${name}」を登録しました`)).toBeVisible();
  await (await openCardRow(page, name)).getByRole("link", { name }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  // 登録の直後は武器で、選べる効果は武器で持てるもの（core の allowedEffectKinds）だけ
  await expect(page.getByLabel("分類")).toHaveValue("WEAPON");
  await expect(page.getByLabel("AT の増減", { exact: true })).not.toBeChecked();
  await expect(page.getByLabel("AT の上書き", { exact: true })).toHaveCount(0);

  await page.getByLabel("分類").selectOption("SCROLL");
  await page.getByRole("button", { name: "分類を変える" }).click();
  await expect(page.getByText("保存しました")).toBeVisible();
  await expect(page.getByLabel("分類")).toHaveValue("SCROLL");
  await expect(page.getByLabel("AT の増減", { exact: true })).toHaveCount(0);

  // 巻物の効果（AT の上書き・強打・地形効果を無視する）。強打は相手の属性を制約にする
  await page.getByLabel("AT の上書き", { exact: true }).check();
  await page.getByLabel("上書きした後の AT の最小").fill("30");
  await page.getByLabel("上書きした後の AT の最大").fill("30");
  await page.getByLabel("強打（AT の倍率）", { exact: true }).check();
  await page.getByLabel("強打の倍率（%）").fill("150");
  await page
    .getByRole("group", { name: /強打する相手の属性/ })
    .getByLabel("水", { exact: true })
    .check();
  await page.getByLabel("地形効果を無視する", { exact: true }).check();
  await page.getByRole("button", { name: "効果を変える" }).click();
  await expect(page.getByText("保存しました").nth(1)).toBeVisible();
  await expect(page.getByLabel("AT の上書き", { exact: true })).toBeChecked();
  await expect(page.getByLabel("上書きした後の AT の最小")).toHaveValue("30");

  // 巻物の効果を持ったままでは防具に変えられない
  await page.getByLabel("分類").selectOption("ARMOR");
  await page.getByRole("button", { name: "分類を変える" }).click();
  await expect(
    page.getByText(
      "今の分類では持てない効果があります。先に効果を外してから分類を変えてください",
    ),
  ).toBeVisible();

  // 公開した後は表示だけ
  await publishCard(page, name);
  // 一覧では、クリーチャーだけの列は「—」で、性能の列に分類と効果が出る（studio#73）
  await expect((await openCardRow(page, name)).getByRole("cell")).toContainText(
    [
      "—",
      "—",
      "—",
      "巻物／AT を 30 に上書き・強打 150%（相手が水）・地形効果を無視する",
    ],
  );
  await (await openCardRow(page, name)).getByRole("link", { name }).click();
  await expect(page.locator("dl").last()).toHaveText(
    /分類\s*巻物\s*効果\s*AT を 30 に上書き・強打 150%（相手が水）・地形効果を無視する/,
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
  await expect(await openCardRow(page, name)).toContainText(
    "カードを 2 枚引く",
  );
  await (await openCardRow(page, name)).getByRole("link", { name }).click();
  await expect(page.locator("dl").last()).toHaveText(
    /効果\s*カードを 2 枚引く/,
  );
});
