import type { BoardTileInput } from "@/graphql/graphql";
import type { Notice } from "../../deck-form";
import {
  BOARD_LAYOUT_INVALID,
  boardConnectionErrorMessage,
  boardSizeErrorMessage,
  boardTileErrorMessage,
} from "../../messages";
import {
  type Cells,
  type Connection,
  isTileAttribute,
  isTileKind,
  type Tile,
} from "../board-layout";

export type Layout = Cells & { width: number; height: number };

// 格子に印は付けない。画面の操作で起こせるレイアウトの誤りは格子の外のマスだけで、格子に描かれないため（studio#33）
export type LayoutError = {
  message: string;
};

// 誤りは、画面で見た版（revision）に結びつける。編集中のレイアウトは画面の状態（layout-editor.tsx）が持つため、ここには残さない
export type ChangeLayoutState = Notice & {
  revision?: number;
  layoutErrors?: LayoutError[];
};

// フォームの値の組み立て。マスは `x,y,種類` で、土地だけ `x,y,種類,属性`（種類は core の出力の型の名前）、つながりは `ax,ay,bx,by` の文字列にして同じ名前で並べる（順番が core の誤りの位置になる）
export function tileField(tile: Tile): string {
  return tile.__typename === "LandTile"
    ? `${tile.x},${tile.y},${tile.__typename},${tile.attribute}`
    : `${tile.x},${tile.y},${tile.__typename}`;
}

export function connectionField({ a, b }: Connection): string {
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
  return { width, height, tiles, connections };
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
  }
}

type FieldError = {
  __typename: string;
  field: string;
  min?: number;
  max?: number;
};

// core の項目名は送った一覧の位置（tiles.N.x・connections.N 等）で返るため、位置から送ったマス・つながりに戻す
export function layoutErrors(
  errors: FieldError[],
  sent: Layout,
): LayoutError[] {
  return errors.map((error) => {
    const [, kind, index] =
      /^(tiles|connections)\.(\d+)/.exec(error.field) ?? [];
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
    return { message: BOARD_LAYOUT_INVALID };
  });
}
