import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CRITERION_DESCRIPTIONS,
  CRITERION_LABELS,
  isCriterion,
  isMatchAction,
  MATCH_ACTION_LABELS,
} from "./labels.ts";

describe("MATCH_ACTION_LABELS", () => {
  it("行動の種類の呼び方は、game の対戦の画面のボタンの文言に合わせている", () => {
    assert.equal(MATCH_ACTION_LABELS.DRAW_CARD, "カードを引く");
    assert.equal(MATCH_ACTION_LABELS.ROLL_DICE, "サイコロを振る");
    assert.equal(MATCH_ACTION_LABELS.END_TURN, "ターンを終える");
  });

  it("行動の種類の呼び方は、どれも重ならない（重みの行を見分けられる）", () => {
    const labels = Object.values(MATCH_ACTION_LABELS);
    assert.equal(new Set(labels).size, labels.length);
  });
});

describe("CRITERION_LABELS", () => {
  it("採点基準ごとに、呼び方と説明がある", () => {
    for (const criterion of Object.keys(CRITERION_LABELS)) {
      assert.ok(CRITERION_LABELS[criterion as keyof typeof CRITERION_LABELS]);
      assert.ok(
        CRITERION_DESCRIPTIONS[
          criterion as keyof typeof CRITERION_DESCRIPTIONS
        ],
      );
    }
  });
});

describe("isMatchAction・isCriterion", () => {
  it("知っている値だけを通す", () => {
    assert.equal(isMatchAction("DRAW_CARD"), true);
    assert.equal(isMatchAction("toString"), false);
    assert.equal(isCriterion("TERRITORY_COUNT"), true);
    assert.equal(isCriterion("DRAW_CARD"), false);
  });
});
