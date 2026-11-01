import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boardPublishProblemMessage,
  boardRuleErrorMessage,
  NAME_ALREADY_IN_USE,
  nameErrorMessage,
  RULE_LABELS,
  ruleStep,
} from "./messages.ts";

describe("nameErrorMessage", () => {
  it("名前が空白だけのときは、名前の入力を促す", () => {
    assert.equal(
      nameErrorMessage([{ __typename: "FieldRequired" }]),
      "名前を入力してください",
    );
  });

  it("長すぎるときは、core が返した上限を文言に入れる", () => {
    assert.equal(
      nameErrorMessage([{ __typename: "FieldTooLong", max: 50 }]),
      "名前は 50 文字以内で入力してください",
    );
  });

  it("誤りが複数あるときは「。」でつなぐ", () => {
    assert.equal(
      nameErrorMessage([
        { __typename: "FieldRequired" },
        { __typename: "FieldTooLong", max: 50 },
      ]),
      "名前を入力してください。名前は 50 文字以内で入力してください",
    );
  });
});

describe("NAME_ALREADY_IN_USE", () => {
  it("全角・半角や大文字・小文字の違いも同じ名前とみなすことを伝える", () => {
    assert.match(NAME_ALREADY_IN_USE, /^この名前はすでに使われています/);
    assert.match(NAME_ALREADY_IN_USE, /全角・半角や大文字・小文字の違い/);
  });
});

describe("boardPublishProblemMessage（公開できない理由の文言）", () => {
  const at = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ x: i, y: 0 }));

  it("拠点が 0 のときは、ちょうど 1 つ置くよう伝える", () => {
    assert.equal(
      boardPublishProblemMessage({
        __typename: "BaseCountProblem",
        positions: [],
      }),
      "拠点がありません。ちょうど 1 つ置いてください",
    );
  });

  it("拠点が複数のときは、数を言ってちょうど 1 つにするよう伝える", () => {
    assert.equal(
      boardPublishProblemMessage({
        __typename: "BaseCountProblem",
        positions: at(2),
      }),
      "拠点が 2 つあります。ちょうど 1 つにしてください",
    );
  });

  it("チェックポイントが無いときは、1 つ以上置くよう伝える", () => {
    assert.equal(
      boardPublishProblemMessage({ __typename: "NoCheckpointProblem" }),
      "チェックポイントがありません。1 つ以上置いてください",
    );
  });

  it("行けないマスは、座標の羅列でなく数で言う", () => {
    const message = boardPublishProblemMessage({
      __typename: "UnreachableTilesProblem",
      positions: at(2),
    });

    assert.equal(message, "拠点から行けないマスが 2 つあります");
    assert.doesNotMatch(message, /\(\d+, \d+\)/);
  });

  it("相手のいない転送円・橋は、数を言って対にするか消すよう伝える", () => {
    assert.equal(
      boardPublishProblemMessage({
        __typename: "UnpairedTilesProblem",
        positions: at(1),
      }),
      "相手のいない転送円・橋が 1 つあります。対にするか、消してください",
    );
  });
});

describe("boardRuleErrorMessage", () => {
  it("下限を割ったときは、core が返した下限を文言に入れる", () => {
    assert.equal(
      boardRuleErrorMessage({
        __typename: "FieldTooSmall",
        field: "roundLimit",
        min: 1,
      }),
      "ラウンドの上限は 1 以上にしてください",
    );
  });

  it("目標の魔力が開始時の魔力以下のときは、比べる相手の項目名から文言を作る", () => {
    assert.equal(
      boardRuleErrorMessage({
        __typename: "FieldNotGreaterThan",
        field: "targetMagic",
        than: "startingMagic",
      }),
      "目標の魔力は開始時の魔力より大きくしてください",
    );
  });

  it("サイコロの目の最大が最小を下回ったときは、比べる相手の項目名から文言を作る", () => {
    assert.equal(
      boardRuleErrorMessage({
        __typename: "FieldLessThan",
        field: "diceMax",
        than: "diceMin",
      }),
      "サイコロの目（最大）はサイコロの目（最小）以上にしてください",
    );
  });

  it("知らない型のときは、項目の入力が正しくないことを伝える", () => {
    assert.equal(
      boardRuleErrorMessage({ __typename: "Other", field: "diceMin" }),
      "サイコロの目（最小）の入力が正しくありません",
    );
  });
});

describe("ruleStep", () => {
  it("魔力は 100 刻み、ラウンドの上限とサイコロの目は 1 刻みにする", () => {
    assert.deepEqual(
      Object.fromEntries(
        (Object.keys(RULE_LABELS) as (keyof typeof RULE_LABELS)[]).map(
          (field) => [field, ruleStep(field)],
        ),
      ),
      {
        targetMagic: 100,
        startingMagic: 100,
        lapBonus: 100,
        checkpointBonus: 100,
        roundLimit: 1,
        diceMin: 1,
        diceMax: 1,
      },
    );
  });
});
