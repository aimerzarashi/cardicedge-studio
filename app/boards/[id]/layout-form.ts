import type { BoardTileInput } from "@/graphql/graphql";
import type { Notice } from "../../deck-form";
import {
  BOARD_LAYOUT_INVALID,
  boardConnectionErrorMessage,
  boardPairErrorMessage,
  boardSizeErrorMessage,
  boardTileErrorMessage,
} from "../../messages";
import {
  type Cells,
  type Connection,
  isTileAttribute,
  isTileKind,
  type Pair,
  type Tile,
} from "../board-layout";
import type { PublishProblem } from "../publish-problems";

export type Layout = Cells & { width: number; height: number };

// 格子に印は付けない。画面の操作ではレイアウトの誤りを起こせず（格子の外のマスは studio#40 で作れなくした）、起きるのは画面と core の決まりがずれたときだけのため（studio#33）
export type LayoutError = {
  message: string;
};

// 誤りは、画面で見た版（revision）に結びつける。編集中のレイアウトは画面の状態（layout-editor.tsx）が持つため、ここには残さない
export type ChangeLayoutState = Notice & {
  revision?: number;
  layoutErrors?: LayoutError[];
};

// 保存を待たない判定（checkBoardLayout）の結果。誤りの文言は保存のときと同じ layoutErrors で作る。
// ignored は、幅・高さが整数でないなど、問い合わせても意味がない入力（今の表示を残す）
export type CheckLayoutResult =
  | { kind: "problems"; problems: PublishProblem[] }
  | { kind: "invalid"; errors: LayoutError[] }
  | { kind: "failed"; message: string }
  | { kind: "ignored" };

// フォームの値の組み立て。マスは `x,y,種類` で、土地だけ `x,y,種類,属性`（種類は core の出力の型の名前）、つながり（`connection`）と対（`pair`）は `ax,ay,bx,by` の文字列にして同じ名前で並べる（順番が core の誤りの位置になる）
export function tileField(tile: Tile): string {
  return tile.__typename === "LandTile"
    ? `${tile.x},${tile.y},${tile.__typename},${tile.attribute}`
    : `${tile.x},${tile.y},${tile.__typename}`;
}

export function connectionField({ a, b }: Connection | Pair): string {
  return `${a.x},${a.y},${b.x},${b.y}`;
}

function integers(value: string, count: number): number[] | undefined {
  const parts = value.split(",");
  const numbers = parts.map((part) => Number(part));
  return parts.length === count && numbers.every(Number.isInteger)
    ? numbers
    : undefined;
}

// 境界の検査は形だけにする（範囲・つながりの正誤は core が判定する）
export function parseLayout(form: FormData): Layout | undefined {
  const width = Number(form.get("width"));
  const height = Number(form.get("height"));
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    return undefined;
  }
  const tiles: Tile[] = [];
  for (const value of form.getAll("tile")) {
    const parts = typeof value === "string" ? value.split(",") : [];
    const xy = integers(parts.slice(0, 2).join(","), 2);
    const [, , kind, attribute] = parts;
    if (xy === undefined || kind === undefined || !isTileKind(kind)) {
      return undefined;
    }
    const position = { x: xy[0], y: xy[1] };
    // 属性があるのは土地だけ
    if (kind === "LandTile") {
      if (parts.length !== 4 || !isTileAttribute(attribute)) {
        return undefined;
      }
      tiles.push({ ...position, __typename: kind, attribute });
    } else if (parts.length === 3) {
      tiles.push({ ...position, __typename: kind });
    } else {
      return undefined;
    }
  }
  const connections: Connection[] = [];
  for (const value of form.getAll("connection")) {
    const n = typeof value === "string" ? integers(value, 4) : undefined;
    if (n === undefined) {
      return undefined;
    }
    connections.push({ a: { x: n[0], y: n[1] }, b: { x: n[2], y: n[3] } });
  }
  const pairs: Pair[] = [];
  for (const value of form.getAll("pair")) {
    const n = typeof value === "string" ? integers(value, 4) : undefined;
    if (n === undefined) {
      return undefined;
    }
    pairs.push({ a: { x: n[0], y: n[1] }, b: { x: n[2], y: n[3] } });
  }
  return { width, height, tiles, connections, pairs };
}

// 保存（changeBoardLayout）と判定（checkBoardLayout）の入力に共通の、幅・高さ・マス・つながり・対
export function layoutInput(layout: Layout) {
  return { ...layout, tiles: layout.tiles.map(tileInput) };
}

// 編集中の値（幅・高さは入力中の文字のまま）を、フォームの送信と同じ名前の FormData にする。保存と同じ parseLayout で読めるようにするため
export function layoutFormData(
  size: { width: string; height: string },
  cells: Cells,
): FormData {
  const form = new FormData();
  form.set("width", size.width);
  form.set("height", size.height);
  for (const tile of cells.tiles) {
    form.append("tile", tileField(tile));
  }
  for (const connection of cells.connections) {
    form.append("connection", connectionField(connection));
  }
  for (const pair of cells.pairs) {
    form.append("pair", connectionField(pair));
  }
  return form;
}

// core の入力は種類ごとに 1 つだけ書く（@oneOf）
export function tileInput(tile: Tile): BoardTileInput {
  const { x, y } = tile;
  switch (tile.__typename) {
    case "LandTile":
      return { land: { x, y, attribute: tile.attribute } };
    case "BaseTile":
      return { base: { x, y } };
    case "CheckpointTile":
      return { checkpoint: { x, y } };
    case "WarpTile":
      return { warp: { x, y } };
    case "BridgeTile":
      return { bridge: { x, y } };
    case "SanctuaryTile":
      return { sanctuary: { x, y } };
    case "ShrineTile":
      return { shrine: { x, y } };
    case "ProphecyShopTile":
      return { prophecyShop: { x, y } };
    case "CardShopTile":
      return { cardShop: { x, y } };
  }
}

type FieldError = {
  __typename: string;
  field: string;
  min?: number;
  max?: number;
};

// core の項目名は送った一覧の位置（tiles.N.x・connections.N・pairs.N.a 等）で返るため、位置から送ったマス・つながりに戻す
export function layoutErrors(
  errors: FieldError[],
  sent: Layout,
): LayoutError[] {
  return errors.map((error) => {
    const [, kind, index] =
      /^(tiles|connections|pairs)\.(\d+)/.exec(error.field) ?? [];
    if (error.field === "width") {
      return { message: boardSizeErrorMessage("幅", error) };
    }
    if (error.field === "height") {
      return { message: boardSizeErrorMessage("高さ", error) };
    }
    const tile = kind === "tiles" ? sent.tiles[Number(index)] : undefined;
    if (tile !== undefined) {
      return { message: boardTileErrorMessage(tile, error) };
    }
    const connection =
      kind === "connections" ? sent.connections[Number(index)] : undefined;
    if (connection !== undefined) {
      return { message: boardConnectionErrorMessage(connection, error) };
    }
    const pair = kind === "pairs" ? sent.pairs[Number(index)] : undefined;
    if (pair !== undefined) {
      return { message: boardPairErrorMessage(pair, error) };
    }
    return { message: BOARD_LAYOUT_INVALID };
  });
}
