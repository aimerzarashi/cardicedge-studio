import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Tile } from "../board-layout.ts";
import { gridSizeFor, inRange, isBelowMin, minSize } from "./layout-size.ts";

const land = (x: number, y: number): Tile => ({
  x,
  y,
  __typename: "LandTile",
  attribute: "FIRE",
});

// 範囲は core の studioRules.board から受け取る値。テストでは適当な値を使う
const RANGE_MIN = 3;
const RANGE_MAX = 20;

describe("minSize", () => {
  it("マスが無ければ、範囲の下限になる", () => {
    assert.deepEqual(minSize([], RANGE_MIN), { width: 3, height: 3 });
  });

  it("置いてあるマスが範囲の下限より外にあれば、そのマスが収まる大きさになる", () => {
    assert.deepEqual(minSize([land(5, 0)], RANGE_MIN), { width: 6, height: 3 });
    assert.deepEqual(minSize([land(0, 7)], RANGE_MIN), { width: 3, height: 8 });
  });

  it("置いてあるマスが範囲の下限の中なら、範囲の下限のまま", () => {
    assert.deepEqual(minSize([land(2, 2)], RANGE_MIN), { width: 3, height: 3 });
  });
});

describe("inRange", () => {
  it("整数で下限以上・上限以下なら、その値になる", () => {
    assert.equal(inRange("5", 8, 3, RANGE_MAX), 5);
    assert.equal(inRange("3", 8, 3, RANGE_MAX), 3);
    assert.equal(inRange("20", 8, 3, RANGE_MAX), 20);
  });

  it("下限より小さい値は、今の大きさのまま", () => {
    assert.equal(inRange("2", 8, 3, RANGE_MAX), 8);
  });

  it("範囲の外の大きな数は、今の大きさのまま（桁違いの数のボタンで固まらない）", () => {
    assert.equal(inRange("21", 8, 3, RANGE_MAX), 8);
    assert.equal(inRange("99999", 8, 3, RANGE_MAX), 8);
  });

  it("空・空白・整数でない文字は、今の大きさのまま", () => {
    assert.equal(inRange("", 8, 0, RANGE_MAX), 8);
    assert.equal(inRange("  ", 8, 0, RANGE_MAX), 8);
    assert.equal(inRange("4.5", 8, 3, RANGE_MAX), 8);
    assert.equal(inRange("abc", 8, 3, RANGE_MAX), 8);
  });
});

describe("gridSizeFor", () => {
  it("幅・高さを別々に判定する", () => {
    assert.deepEqual(
      gridSizeFor(
        { width: "6", height: "99999" },
        { width: 8, height: 8 },
        { width: 3, height: 3 },
        RANGE_MAX,
      ),
      { width: 6, height: 8 },
    );
  });

  it("置いてあるマスの分だけ下がった下限まで、縮められる", () => {
    assert.deepEqual(
      gridSizeFor(
        { width: "3", height: "8" },
        { width: 8, height: 8 },
        { width: 3, height: 3 },
        RANGE_MAX,
      ),
      { width: 3, height: 8 },
    );
  });
});

describe("isBelowMin", () => {
  const lower = { width: 3, height: 3 };

  it("幅か高さが下限より小さいと、問い合わせない", () => {
    assert.equal(isBelowMin({ width: "2", height: "8" }, lower), true);
    assert.equal(isBelowMin({ width: "8", height: "2" }, lower), true);
  });

  it("下限ちょうどなら問い合わせる", () => {
    assert.equal(isBelowMin({ width: "3", height: "3" }, lower), false);
  });
});
