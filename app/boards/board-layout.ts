import type { BoardTileAttribute } from "@/graphql/graphql";

// ボードの格子の形（座標は core と同じ 0 始まりの (列, 行)）。表示（board-grid.tsx）と編集（[id]/layout-editor.tsx）で共通

export type Position = { x: number; y: number };
// core の出力（LandTile・BaseTile・CheckpointTile）と同じ形で、種類は __typename で見分ける。属性は土地だけが必ず持つ
export type Placement =
  | { __typename: "LandTile"; attribute: BoardTileAttribute }
  | { __typename: "BaseTile" }
  | { __typename: "CheckpointTile" };
export type Tile = Position & Placement;
// a は座標が小さい側（行 → 列の順に比べる）。core が返す向きと、画面で作る向きをそろえるため、a と b を入れ替えた同じつながりは作らない
export type Connection = { a: Position; b: Position };
export type Cells = { tiles: Tile[]; connections: Connection[] };

// 格子のマスに付ける印。種類で見分ける（色・枠の形が違う）。label は印の説明（マスの名前に添える）
export type MarkKind = "base" | "unreachable";
export type Mark = Position & { kind: MarkKind; label: string };

export const TILE_KIND_LABELS: Record<Placement["__typename"], string> = {
  LandTile: "土地",
  BaseTile: "拠点",
  CheckpointTile: "チェックポイント",
};

// 並びは道具・凡例の並び（火・地・水・風・無・複）
export const ATTRIBUTE_LABELS: Record<BoardTileAttribute, string> = {
  FIRE: "火",
  EARTH: "地",
  WATER: "水",
  WIND: "風",
  NEUTRAL: "無",
  MULTI: "複",
};

export function isTileAttribute(value: string): value is BoardTileAttribute {
  return Object.hasOwn(ATTRIBUTE_LABELS, value);
}

// 土地は属性つきの名前（「火属性の土地」）で呼ぶ
export function tileLabel(placement: Placement): string {
  return placement.__typename === "LandTile"
    ? `${ATTRIBUTE_LABELS[placement.attribute]}属性の${TILE_KIND_LABELS.LandTile}`
    : TILE_KIND_LABELS[placement.__typename];
}

export function isTileKind(value: string): value is Placement["__typename"] {
  return Object.hasOwn(TILE_KIND_LABELS, value);
}

export function samePosition(p: Position, q: Position): boolean {
  return p.x === q.x && p.y === q.y;
}

export function sameConnection(c: Connection, d: Connection): boolean {
  return samePosition(c.a, d.a) && samePosition(c.b, d.b);
}

export function tileAt(tiles: Tile[], position: Position): Tile | undefined {
  return tiles.find((tile) => samePosition(tile, position));
}

export function connectionBetween(p: Position, q: Position): Connection {
  return p.y < q.y || (p.y === q.y && p.x < q.x)
    ? { a: p, b: q }
    : { a: q, b: p };
}

export function hasConnection(
  connections: Connection[],
  connection: Connection,
): boolean {
  return connections.some((c) => sameConnection(c, connection));
}

// 新しく置いたマスだけ、隣に置いてあるマスと自動でつなぐ。置き直し（種類・属性の変更）で再びつなぐと、切ったつながりが戻ってしまう
export function placeTile(
  { tiles, connections }: Cells,
  position: Position,
  placement: Placement,
): Cells {
  if (tileAt(tiles, position)) {
    return {
      tiles: tiles.map((tile) =>
        samePosition(tile, position) ? { ...position, ...placement } : tile,
      ),
      connections,
    };
  }
  const neighbors = [
    { x: position.x - 1, y: position.y },
    { x: position.x + 1, y: position.y },
    { x: position.x, y: position.y - 1 },
    { x: position.x, y: position.y + 1 },
  ].filter((neighbor) => tileAt(tiles, neighbor));
  return {
    tiles: [...tiles, { ...position, ...placement }],
    connections: [
      ...connections,
      ...neighbors.map((neighbor) => connectionBetween(position, neighbor)),
    ],
  };
}

export function removeTile(
  { tiles, connections }: Cells,
  position: Position,
): Cells {
  return {
    tiles: tiles.filter((tile) => !samePosition(tile, position)),
    connections: connections.filter(
      (c) => !samePosition(c.a, position) && !samePosition(c.b, position),
    ),
  };
}

export function toggleConnection(
  { tiles, connections }: Cells,
  connection: Connection,
): Cells {
  if (hasConnection(connections, connection)) {
    return {
      tiles,
      connections: connections.filter((c) => !sameConnection(c, connection)),
    };
  }
  return { tiles, connections: [...connections, connection] };
}
