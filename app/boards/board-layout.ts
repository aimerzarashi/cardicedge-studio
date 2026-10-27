import type { BoardTileKind } from "@/graphql/graphql";

// ボードの格子の形（座標は core と同じ 0 始まりの (列, 行)）。表示（board-grid.tsx）と編集（[id]/layout-editor.tsx）で共通

export type Position = { x: number; y: number };
export type Tile = Position & { kind: BoardTileKind };
// a は座標が小さい側（行 → 列の順に比べる）。core が返す向きと、画面で作る向きをそろえるため、a と b を入れ替えた同じつながりは作らない
export type Connection = { a: Position; b: Position };
export type Cells = { tiles: Tile[]; connections: Connection[] };

export const TILE_KIND_LABELS: Record<BoardTileKind, string> = {
  LAND: "土地",
  BASE: "拠点",
  CHECKPOINT: "チェックポイント",
};

export function isTileKind(value: string): value is BoardTileKind {
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

// 新しく置いたマスだけ、隣に置いてあるマスと自動でつなぐ。置き直し（種類の変更）で再びつなぐと、切ったつながりが戻ってしまう
export function placeTile(
  { tiles, connections }: Cells,
  position: Position,
  kind: BoardTileKind,
): Cells {
  if (tileAt(tiles, position)) {
    return {
      tiles: tiles.map((tile) =>
        samePosition(tile, position) ? { ...position, kind } : tile,
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
    tiles: [...tiles, { ...position, kind }],
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
