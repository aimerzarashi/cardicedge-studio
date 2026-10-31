import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Mark, PairLabel, Placement, Tile } from "./board-layout.ts";
import {
  BASE_COLOR,
  BRIDGE_COLOR,
  CHECKPOINT_COLOR,
  FACILITY_COLOR,
  FACILITY_GLYPHS,
  LAND_COLORS,
  LEGEND,
  MARK_STYLES,
  markOutline,
  markStyle,
  paint,
  tileName,
  tileText,
  WARP_COLOR,
} from "./board-paint.ts";

const tile = (placement: Placement, x = 0, y = 0): Tile => ({
  x,
  y,
  ...placement,
});
const land = (
  attribute: "FIRE" | "EARTH" | "WATER" | "WIND" | "NEUTRAL" | "MULTI",
) => tile({ __typename: "LandTile", attribute });
const mark = (kind: Mark["kind"], label = "理由"): Mark => ({
  x: 0,
  y: 0,
  kind,
  label,
});
const pair = (number: number, end: 1 | 2): PairLabel => ({ number, end });

describe("paint（マスの色）", () => {
  it("土地は属性ごとの色で塗る", () => {
    assert.equal(paint(land("EARTH")).background, LAND_COLORS.EARTH);
    assert.equal(paint(land("WIND")).background, LAND_COLORS.WIND);
    assert.equal(paint(land("FIRE")).background, LAND_COLORS.FIRE);
  });

  it("複属性は 4 色を 4 つに分けて塗る", () => {
    assert.match(
      String(paint(land("MULTI")).background),
      /^conic-gradient\(.*25%.*50%.*75%/,
    );
  });

  it("拠点・チェックポイント・転送円・橋は、それぞれの色で塗る", () => {
    assert.equal(
      paint(tile({ __typename: "BaseTile" })).background,
      BASE_COLOR,
    );
    assert.equal(
      paint(tile({ __typename: "CheckpointTile" })).background,
      CHECKPOINT_COLOR,
    );
    assert.equal(
      paint(tile({ __typename: "WarpTile" })).background,
      WARP_COLOR,
    );
    assert.equal(
      paint(tile({ __typename: "BridgeTile" })).background,
      BRIDGE_COLOR,
    );
  });

  it("施設 4 つは共通の色で塗る", () => {
    for (const kind of Object.keys(
      FACILITY_GLYPHS,
    ) as (keyof typeof FACILITY_GLYPHS)[]) {
      assert.equal(
        paint(tile({ __typename: kind })).background,
        FACILITY_COLOR,
      );
    }
  });

  it("マスが無ければ、破線の枠だけで塗らない", () => {
    assert.deepEqual(paint(undefined), {
      border: "1px dashed #5a6480",
      background: "transparent",
    });
  });

  it("属性・種類の色はどれも違う（見分けがつく）", () => {
    const colors = [
      ...Object.values(LAND_COLORS),
      BASE_COLOR,
      CHECKPOINT_COLOR,
      WARP_COLOR,
      BRIDGE_COLOR,
      FACILITY_COLOR,
    ];

    assert.equal(new Set(colors).size, colors.length);
  });
});

describe("tileText（マスの中の文字）", () => {
  it("施設は 1 文字（聖・祠・占・店）", () => {
    assert.equal(
      tileText(tile({ __typename: "SanctuaryTile" }), undefined),
      "聖",
    );
    assert.equal(tileText(tile({ __typename: "ShrineTile" }), undefined), "祠");
    assert.equal(
      tileText(tile({ __typename: "ProphecyShopTile" }), undefined),
      "占",
    );
    assert.equal(
      tileText(tile({ __typename: "CardShopTile" }), undefined),
      "店",
    );
  });

  it("転送円・橋は対の番号「1-1」「1-2」、相手のいないものは「?」", () => {
    const warp = tile({ __typename: "WarpTile" });
    const bridge = tile({ __typename: "BridgeTile" });

    assert.equal(tileText(warp, pair(1, 1)), "1-1");
    assert.equal(tileText(bridge, pair(2, 2)), "2-2");
    assert.equal(tileText(warp, undefined), "?");
    assert.equal(tileText(bridge, undefined), "?");
  });

  it("土地・拠点・チェックポイントには文字を書かない", () => {
    assert.equal(tileText(land("FIRE"), undefined), undefined);
    assert.equal(
      tileText(tile({ __typename: "BaseTile" }), undefined),
      undefined,
    );
    assert.equal(
      tileText(tile({ __typename: "CheckpointTile" }), undefined),
      undefined,
    );
  });
});

describe("LEGEND", () => {
  it("道具と同じ 14 個で、消すは無い", () => {
    assert.equal(LEGEND.length, 14);
  });
});

describe("印の枠", () => {
  it("種類ごとに、色と線の形が違う", () => {
    const styles = Object.values(MARK_STYLES);

    assert.equal(new Set(styles.map((s) => s.color)).size, styles.length);
    assert.deepEqual(
      [
        MARK_STYLES.base.line,
        MARK_STYLES.unreachable.line,
        MARK_STYLES.unpaired.line,
      ],
      ["solid", "dashed", "dotted"],
    );
  });

  it("focus すると枠が太くなり、光る", () => {
    assert.equal(
      markOutline("base", false).outline,
      `3px solid ${MARK_STYLES.base.color}`,
    );
    assert.equal(
      markOutline("base", true).outline,
      `5px solid ${MARK_STYLES.base.color}`,
    );
    assert.equal(markOutline("base", false).boxShadow, undefined);
    assert.ok(markOutline("base", true).boxShadow);
  });

  it("印が無ければ何も付けない", () => {
    assert.deepEqual(markStyle([], false), {});
  });

  it("1 つの印は、その種類の枠になる", () => {
    assert.deepEqual(markStyle([mark("unreachable")], false), {
      ...markOutline("unreachable", false),
      boxShadow: undefined,
    });
  });

  it("理由が重なるマスは、先頭の枠に、2 つめからの色の輪を重ねる", () => {
    const style = markStyle([mark("unreachable"), mark("unpaired")], false);

    assert.equal(style.outline, markOutline("unreachable", false).outline);
    assert.equal(style.boxShadow, `0 0 0 10px ${MARK_STYLES.unpaired.color}`);
  });

  it("3 つ重なると、輪は外へ広がる", () => {
    const style = markStyle(
      [mark("base"), mark("unreachable"), mark("unpaired")],
      false,
    );

    assert.equal(
      style.boxShadow,
      `0 0 0 10px ${MARK_STYLES.unreachable.color}, 0 0 0 14px ${MARK_STYLES.unpaired.color}`,
    );
  });
});

describe("tileName（マスの名前）", () => {
  const origin = { x: 2, y: 0 };

  it("マスが無ければ座標だけ", () => {
    assert.equal(
      tileName(origin, undefined, undefined, false, []),
      "(2, 0) のマス",
    );
  });

  it("置いてあれば種類が付く", () => {
    assert.equal(
      tileName(origin, tile({ __typename: "BaseTile" }), undefined, false, []),
      "(2, 0) のマス 拠点",
    );
  });

  it("土地は属性つきの名前になる", () => {
    assert.equal(
      tileName({ x: 1, y: 0 }, land("FIRE"), undefined, false, []),
      "(1, 0) のマス 火属性の土地",
    );
  });

  it("対になっている転送円・橋には番号が付く", () => {
    assert.equal(
      tileName(origin, tile({ __typename: "WarpTile" }), pair(1, 1), false, []),
      "(2, 0) のマス 転送円 1-1",
    );
    assert.equal(
      tileName(
        origin,
        tile({ __typename: "BridgeTile" }),
        pair(2, 2),
        false,
        [],
      ),
      "(2, 0) のマス 橋 2-2",
    );
  });

  it("相手のいない転送円・橋は「相手なし」", () => {
    assert.equal(
      tileName(origin, tile({ __typename: "WarpTile" }), undefined, false, []),
      "(2, 0) のマス 転送円 相手なし",
    );
    assert.equal(
      tileName(
        origin,
        tile({ __typename: "BridgeTile" }),
        undefined,
        false,
        [],
      ),
      "(2, 0) のマス 橋 相手なし",
    );
  });

  it("転送円・橋以外には番号が付かない", () => {
    assert.equal(
      tileName(origin, land("FIRE"), pair(1, 1), false, []),
      "(2, 0) のマス 火属性の土地",
    );
  });

  it("相手待ちは「（相手待ち）」を添える", () => {
    assert.equal(
      tileName(origin, tile({ __typename: "WarpTile" }), undefined, true, []),
      "(2, 0) のマス 転送円 相手なし（相手待ち）",
    );
  });

  it("印の説明は、重なっていれば理由ごとに末尾へ並ぶ", () => {
    assert.equal(
      tileName(origin, tile({ __typename: "WarpTile" }), undefined, false, [
        mark("unreachable", "拠点から行けないマスが 1 つあります"),
        mark(
          "unpaired",
          "相手のいない転送円・橋が 1 つあります。対にするか、消してください",
        ),
      ]),
      "(2, 0) のマス 転送円 相手なし（拠点から行けないマスが 1 つあります）（相手のいない転送円・橋が 1 つあります。対にするか、消してください）",
    );
  });
});
