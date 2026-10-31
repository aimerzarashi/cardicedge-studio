import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  centerOn,
  clamp,
  fitView,
  LINK,
  MAX_SCALE,
  MIN_SCALE,
  span,
  TILE,
  tracks,
  zoomAt,
} from "./board-view.ts";

const near = (actual: number, expected: number) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

describe("span", () => {
  it("マスの一辺とつながりの幅から、個数ぶんの長さを出す", () => {
    assert.equal(span(1), TILE);
    assert.equal(span(3), 3 * TILE + 2 * LINK);
  });
});

describe("tracks", () => {
  it("マス・間・マスの順に並べる", () => {
    assert.equal(
      tracks(3, TILE),
      `${TILE}px ${LINK}px ${TILE}px ${LINK}px ${TILE}px`,
    );
  });

  it("幅 1 のときも repeat を使わずに 1 つだけ並べる", () => {
    assert.equal(tracks(1, TILE), `${TILE}px`);
  });
});

describe("clamp", () => {
  it("倍率を下限・上限の中に収める", () => {
    assert.equal(clamp(0), MIN_SCALE);
    assert.equal(clamp(100), MAX_SCALE);
    assert.equal(clamp(1), 1);
  });
});

describe("fitView", () => {
  const size = { width: 800, height: 448 };

  it("全体が枠に収まる倍率になる", () => {
    const view = fitView(size, 8, 8);
    const boundsW = (span(8) + span(8)) / Math.SQRT2;

    assert.ok(view.scale * boundsW <= size.width);
    assert.ok((view.scale * boundsW) / 2 <= size.height);
  });

  it("倍率は下限・上限の中に収まる", () => {
    assert.equal(fitView({ width: 1, height: 1 }, 30, 30).scale, MIN_SCALE);
    assert.equal(fitView({ width: 1e6, height: 1e6 }, 1, 1).scale, MAX_SCALE);
  });

  it("全体を枠の中央に置く（左右対称なボードは、回した形の横幅の中心が枠の中心）", () => {
    const view = fitView(size, 8, 8);
    // 回した形の横は x − gridH/√2 〜 x + gridW/√2（倍率を掛ける）。正方形なので中心は x
    near(view.x, size.width / 2);
  });
});

describe("centerOn", () => {
  const size = { width: 800, height: 448 };

  it("倍率は変えない", () => {
    const view = { scale: 0.7, x: 10, y: 20 };

    assert.equal(centerOn(view, size, { x: 3, y: 4 }).scale, 0.7);
  });

  it("(0, 0) のマスの中心を、枠の中央へ動かす", () => {
    const view = centerOn({ scale: 1, x: 0, y: 0 }, size, { x: 0, y: 0 });
    // マスの中心 (24, 24) は回すと横 0・縦 24*2/√2/2 の位置に来る
    near(view.x, size.width / 2);
    near(view.y, size.height / 2 - (TILE / 2 + TILE / 2) / Math.SQRT2 / 2);
  });

  it("前の位置によらず、位置だけで決まる", () => {
    const a = centerOn({ scale: 1, x: 0, y: 0 }, size, { x: 2, y: 3 });
    const b = centerOn({ scale: 1, x: 99, y: -99 }, size, { x: 2, y: 3 });

    assert.deepEqual(a, b);
  });
});

describe("zoomAt", () => {
  it("指した点を動かさずに倍率を変える", () => {
    const view = { scale: 1, x: 100, y: 50 };
    const zoomed = zoomAt(view, 2, 300, 200);

    assert.equal(zoomed.scale, 2);
    // 指した点に重なっていた元の座標（(300 − x) / scale）が、倍率を変えても同じ点に重なる
    near((300 - zoomed.x) / zoomed.scale, (300 - view.x) / view.scale);
    near((200 - zoomed.y) / zoomed.scale, (200 - view.y) / view.scale);
  });

  it("倍率は上限を超えない。上限のときは位置も動かない", () => {
    const view = { scale: MAX_SCALE, x: 100, y: 50 };

    assert.deepEqual(zoomAt(view, 2, 300, 200), view);
  });
});
