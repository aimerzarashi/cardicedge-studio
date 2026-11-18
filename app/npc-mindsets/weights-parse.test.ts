import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseWeights, weightsErrors } from "./weights-parse.ts";

function formOf(entries: [string, string][]): FormData {
  const form = new FormData();
  for (const [name, value] of entries) {
    form.append(name, value);
  }
  return form;
}

describe("parseWeights", () => {
  it("画面に並んでいた順に、すべての行を数にして返す", () => {
    const parsed = parseWeights(
      formOf([
        ["id", "x"],
        ["weight.DRAW_CARD", "10"],
        ["weight.END_TURN", "0"],
      ]),
      3,
    );
    assert.deepEqual(parsed, {
      kind: "parsed",
      values: { DRAW_CARD: "10", END_TURN: "0" },
      weights: [
        { key: "DRAW_CARD", weight: 10 },
        { key: "END_TURN", weight: 0 },
      ],
    });
  });

  it("整数でない行は、その行の誤りにして、入力した値と版を残す", () => {
    const parsed = parseWeights(
      formOf([
        ["weight.DRAW_CARD", "1.5"],
        ["weight.END_TURN", ""],
        ["weight.ROLL_DICE", "5"],
      ]),
      3,
    );
    assert.deepEqual(parsed, {
      kind: "invalid",
      state: {
        revision: 3,
        values: { DRAW_CARD: "1.5", END_TURN: "", ROLL_DICE: "5" },
        rowErrors: {
          DRAW_CARD: "重みは整数で入力してください",
          END_TURN: "重みは整数で入力してください",
        },
      },
    });
  });
});

describe("weightsErrors", () => {
  const weights = [{ key: "DRAW_CARD" }, { key: "END_TURN" }];

  it("範囲外は、core が返した項目名の番号から行に戻し、範囲は core が返した値を使う", () => {
    assert.deepEqual(
      weightsErrors(
        [
          {
            __typename: "FieldOutOfRange",
            field: "weights.1.weight",
            min: 0,
            max: 100,
          },
        ],
        weights,
      ),
      { rowErrors: { END_TURN: "重みは 0〜100 の整数にしてください" } },
    );
  });

  it("行に戻せない誤りは、画面全体の誤りにする", () => {
    assert.deepEqual(
      weightsErrors(
        [{ __typename: "FieldRequired", field: "weights" }],
        weights,
      ),
      { error: "入力が正しくありません", rowErrors: {} },
    );
  });
});
