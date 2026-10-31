import type { CSSProperties } from "react";
import {
  isPairableKind,
  type Mark,
  type MarkKind,
  type PairLabel,
  PLACEMENTS,
  type Position,
  type Tile,
  tileLabel,
} from "./board-layout.ts";

// 格子の色・文字・印・マスの名前。部品（board-grid.tsx）から React を抜いた純粋な関数と定数で、game#9 にも写す。
// 部品の中に置かないのは、JSX を含む .tsx は node --test で読めず、単体テストにできないため

// 属性の色。拠点・チェックポイントは属性に使わない色（紫・明るめの桃色）にして、土地と見分ける。
// 枠の模様（二重の枠・斜線）で分ける案は、斜め見下ろしでつぶすと見分けにくいため採らなかった。
// 白はつながりの印に使うので、マスには使わない
const FIRE = "#d9534f";
const EARTH = "#5fae5f";
const WATER = "#4a7fd4";
const WIND = "#c8a24a";
export const LAND_COLORS = {
  FIRE,
  EARTH,
  WATER,
  WIND,
  NEUTRAL: "#9e9e9e",
  // 4 色を 4 つに分けて塗る
  MULTI: `conic-gradient(${FIRE} 0 25%, ${EARTH} 0 50%, ${WATER} 0 75%, ${WIND} 0)`,
};
export const BASE_COLOR = "#8e4ec6";
export const CHECKPOINT_COLOR = "#f7a8c8";
export const WARP_COLOR = "#20b2aa";
export const BRIDGE_COLOR = "#8b5a2b";
export const FACILITY_COLOR = "#3a3f55";
// 施設のマスに書く 1 文字
export const FACILITY_GLYPHS = {
  SanctuaryTile: "聖",
  ShrineTile: "祠",
  ProphecyShopTile: "占",
  CardShopTile: "店",
};
export const BOARD_BACKGROUND = "#1b2440";
export const CONNECTED = "#ffffff";
export const DISCONNECTED = "#4a5470";

// 凡例は、道具と同じ並びのマスの見本（置く道具と同じ PLACEMENTS から作る）
export const LEGEND: Tile[] = PLACEMENTS.map((placement) => ({
  x: 0,
  y: 0,
  ...placement,
}));

export function paint(tile: Tile | undefined): CSSProperties {
  if (!tile) {
    return { border: "1px dashed #5a6480", background: "transparent" };
  }
  switch (tile.__typename) {
    case "BaseTile":
      return { border: "1px solid #555", background: BASE_COLOR };
    case "CheckpointTile":
      return { border: "1px solid #555", background: CHECKPOINT_COLOR };
    case "LandTile":
      return {
        border: "1px solid #555",
        background: LAND_COLORS[tile.attribute],
      };
    case "WarpTile":
      return { border: "1px solid #555", background: WARP_COLOR };
    case "BridgeTile":
      return { border: "1px solid #555", background: BRIDGE_COLOR };
    case "SanctuaryTile":
    case "ShrineTile":
    case "ProphecyShopTile":
    case "CardShopTile":
      return { border: "1px solid #555", background: FACILITY_COLOR };
  }
}

// マスの中に書く文字（特殊なマスだけ）。転送円・橋は対の番号で、相手のいないものは「?」
export function tileText(
  tile: Tile,
  pair: PairLabel | undefined,
): string | undefined {
  switch (tile.__typename) {
    case "WarpTile":
    case "BridgeTile":
      return pair ? `${pair.number}-${pair.end}` : "?";
    case "SanctuaryTile":
    case "ShrineTile":
    case "ProphecyShopTile":
    case "CardShopTile":
      return FACILITY_GLYPHS[tile.__typename];
    default:
      return undefined;
  }
}

// 印は枠で見せる（マスの色は塗りなので重ならない）。種類は色と線の形の両方で分ける
export const MARK_STYLES: Record<
  MarkKind,
  { color: string; line: "solid" | "dashed" | "dotted"; legend: string }
> = {
  base: { color: "#ffe600", line: "solid", legend: "拠点の数の印" },
  unreachable: {
    color: "#00e5ff",
    line: "dashed",
    legend: "拠点から行けないマスの印",
  },
  // 相手待ちの枠（白い点線の border）とは色と置き場所（outline）で分ける
  unpaired: {
    color: "#ff8c00",
    line: "dotted",
    legend: "相手のいない転送円・橋の印",
  },
};

export function markOutline(kind: MarkKind, focused: boolean): CSSProperties {
  const { color, line } = MARK_STYLES[kind];
  return {
    outline: `${focused ? 5 : 3}px ${line} ${color}`,
    outlineOffset: 2,
    boxShadow: focused ? `0 0 14px 6px ${color}` : undefined,
  };
}

// 1 つのマスに理由が重なる（相手のいない転送円がつながっておらず、行けないマスでもある等）ときは、
// 2 つめからを outline の外側の輪（box-shadow）で重ねる。outline は 1 本しか引けず、先頭だけだと残りの理由が見えないため
export function markStyle(marks: Mark[], focused: boolean): CSSProperties {
  const [first, ...rest] = marks;
  if (first === undefined) {
    return {};
  }
  const style = markOutline(first.kind, focused);
  const rings = rest.map(
    (mark, i) => `0 0 0 ${10 + i * 4}px ${MARK_STYLES[mark.kind].color}`,
  );
  const shadows = [...rings, style.boxShadow].filter(Boolean).join(", ");
  return { ...style, boxShadow: shadows || undefined };
}

// マスの名前（読み上げとテストの手がかり）。置いてあれば種類が付き、転送円・橋には対の番号（なければ「相手なし」）を添える。
// 相手待ちと印の説明は末尾に括弧で足す
export function tileName(
  position: Position,
  tile: Tile | undefined,
  pair: PairLabel | undefined,
  waiting: boolean,
  marks: Mark[],
): string {
  const name = `(${position.x}, ${position.y}) のマス`;
  const pairName =
    tile && isPairableKind(tile.__typename)
      ? ` ${pair ? `${pair.number}-${pair.end}` : "相手なし"}`
      : "";
  return `${tile ? `${name} ${tileLabel(tile)}${pairName}` : name}${waiting ? "（相手待ち）" : ""}${marks.map((mark) => `（${mark.label}）`).join("")}`;
}
