import type { BoardTileAttribute } from "@/graphql/graphql";

// ボードの格子の形（座標は core と同じ 0 始まりの (列, 行)）。表示（board-grid.tsx）と編集（[id]/layout-editor.tsx）で共通

export type Position = { x: number; y: number };
// core の出力（LandTile・BaseTile・CheckpointTile）と同じ形で、種類は __typename で見分ける。属性は土地だけが必ず持つ
export type Placement =
  | { __typename: "LandTile"; attribute: BoardTileAttribute }
  | { __typename: "BaseTile" }
  | { __typename: "CheckpointTile" }
  | { __typename: "WarpTile" }
  | { __typename: "BridgeTile" }
  | { __typename: "SanctuaryTile" }
  | { __typename: "ShrineTile" }
  | { __typename: "ProphecyShopTile" }
  | { __typename: "CardShopTile" };
export type Tile = Position & Placement;
// a は座標が小さい側（行 → 列の順に比べる）。core が返す向きと、画面で作る向きをそろえるため、a と b を入れ替えた同じつながりは作らない
export type Connection = { a: Position; b: Position };
// 転送円どうし・橋どうしの対（向きは無い）。a は座標が小さい側で、つながりと同じ形・同じそろえ方にする
export type Pair = Connection;
export type Cells = { tiles: Tile[]; connections: Connection[]; pairs: Pair[] };

// 格子のマスに付ける印。種類で見分ける（色・枠の形が違う）。label は印の説明（マスの名前に添える）
export type MarkKind = "base" | "unreachable" | "unpaired";
export type Mark = Position & { kind: MarkKind; label: string };

export const TILE_KIND_LABELS: Record<Placement["__typename"], string> = {
  LandTile: "土地",
  BaseTile: "拠点",
  CheckpointTile: "チェックポイント",
  WarpTile: "転送円",
  BridgeTile: "橋",
  SanctuaryTile: "聖堂",
  ShrineTile: "ほこら",
  ProphecyShopTile: "占い館",
  CardShopTile: "カード屋",
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

// 道具・凡例の並び（拠点・チェックポイント・土地 6 つ・転送円・橋・施設 4 つ）。消すは置くマスではないため含めない
export const PLACEMENTS: Placement[] = [
  { __typename: "BaseTile" },
  { __typename: "CheckpointTile" },
  ...(Object.keys(ATTRIBUTE_LABELS) as BoardTileAttribute[]).map(
    (attribute) => ({ __typename: "LandTile" as const, attribute }),
  ),
  { __typename: "WarpTile" },
  { __typename: "BridgeTile" },
  { __typename: "SanctuaryTile" },
  { __typename: "ShrineTile" },
  { __typename: "ProphecyShopTile" },
  { __typename: "CardShopTile" },
];

export function isTileKind(value: string): value is Placement["__typename"] {
  return Object.hasOwn(TILE_KIND_LABELS, value);
}

export function samePosition(p: Position, q: Position): boolean {
  return p.x === q.x && p.y === q.y;
}

export function sameConnection(c: Connection, d: Connection): boolean {
  return samePosition(c.a, d.a) && samePosition(c.b, d.b);
}

export function sameKind(
  tile: Tile | undefined,
  kind: Placement["__typename"],
) {
  return tile?.__typename === kind;
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
  { tiles, connections, pairs }: Cells,
  position: Position,
  placement: Placement,
): Cells {
  const current = tileAt(tiles, position);
  if (current) {
    return {
      tiles: tiles.map((tile) =>
        samePosition(tile, position) ? { ...position, ...placement } : tile,
      ),
      connections,
      // 種類が変わると、対の端ではなくなる（もう一方は相手のいないまま残る）。同じ種類への置き直し（属性の変更等）は対を残す
      pairs:
        current.__typename === placement.__typename
          ? pairs
          : withoutPairsAt(pairs, position),
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
    pairs,
  };
}

export function removeTile(
  { tiles, connections, pairs }: Cells,
  position: Position,
): Cells {
  return {
    pairs: withoutPairsAt(pairs, position),
    tiles: tiles.filter((tile) => !samePosition(tile, position)),
    connections: connections.filter(
      (c) => !samePosition(c.a, position) && !samePosition(c.b, position),
    ),
  };
}

export function toggleConnection(
  { tiles, connections, pairs }: Cells,
  connection: Connection,
): Cells {
  if (hasConnection(connections, connection)) {
    return {
      tiles,
      connections: connections.filter((c) => !sameConnection(c, connection)),
      pairs,
    };
  }
  return { tiles, connections: [...connections, connection], pairs };
}

// --- 転送円・橋の対 ---
// 対の編集は画面の部品でなくここに置く（placeTile 等と同じく、状態を受け取って次の状態を返す純粋な関数）

export type PairableKind = "WarpTile" | "BridgeTile";

export function isPairableKind(
  kind: Placement["__typename"],
): kind is PairableKind {
  return kind === "WarpTile" || kind === "BridgeTile";
}

function pairIncludes(pair: Pair, position: Position): boolean {
  return samePosition(pair.a, position) || samePosition(pair.b, position);
}

function withoutPairsAt(pairs: Pair[], position: Position): Pair[] {
  return pairs.filter((pair) => !pairIncludes(pair, position));
}

export function pairAt(pairs: Pair[], position: Position): Pair | undefined {
  return pairs.find((pair) => pairIncludes(pair, position));
}

// 相手のいない転送円・橋（種類が kind で、どの対にも入っていない）
function isUnpaired(
  { tiles, pairs }: Cells,
  position: Position,
  kind: PairableKind,
): boolean {
  return sameKind(tileAt(tiles, position), kind) && !pairAt(pairs, position);
}

// 対にする。a は座標が小さい側にそろえる（core が返す向きと、画面で作る向きをそろえるため）
function addPair(cells: Cells, p: Position, q: Position): Cells {
  return { ...cells, pairs: [...cells.pairs, connectionBetween(p, q)] };
}

// 転送円（橋）の道具でマスを押したときの動き。pending は「相手待ち」に選んでいるマス（画面の中だけの状態）。
//   - 対になっているものを押す: 何もしない（組み替えは片方を消して置き直す）
//   - 相手のいないものを押す: 相手待ちが無ければそれを相手待ちに選ぶ。同じものなら相手待ちをやめる。ほかのものなら対にする
//   - それ以外（空き・ほかの種類のマス・対になっているほかの種類のマス）を押す: 置いて（ほかの種類のマスは置き換える。元の対は切れる）、
//     相手待ちが無ければそれを相手待ちに、あれば相手待ちと対にする
export function pressPairable(
  cells: Cells,
  position: Position,
  kind: PairableKind,
  pending: Position | undefined,
): { cells: Cells; pending: Position | undefined } {
  const tile = tileAt(cells.tiles, position);
  if (sameKind(tile, kind) && pairAt(cells.pairs, position)) {
    return { cells, pending };
  }
  // 相手待ちが、いまも相手のいない同じ種類のマスのときだけ有効とする
  const waiting =
    pending !== undefined && isUnpaired(cells, pending, kind)
      ? pending
      : undefined;
  if (isUnpaired(cells, position, kind)) {
    if (waiting === undefined) {
      return { cells, pending: position };
    }
    return samePosition(waiting, position)
      ? { cells, pending: undefined }
      : { cells: addPair(cells, waiting, position), pending: undefined };
  }
  const placed = placeTile(cells, position, { __typename: kind });
  return waiting === undefined
    ? { cells: placed, pending: position }
    : { cells: addPair(placed, waiting, position), pending: undefined };
}

// 転送円・橋の見分け。番号は、同じ種類の対の中での並び（cells.pairs の順。編集中に番号が飛び回らないよう、座標では並べ替えない）で 1 から振り、
// 端は a が 1・b が 2（「1-1」「1-2」）。相手のいないものは番号を持たない
export type PairLabel = { number: number; end: 1 | 2 };

export function pairLabel(
  { tiles, pairs }: Pick<Cells, "tiles" | "pairs">,
  tile: Tile,
): PairLabel | undefined {
  const pair = pairAt(pairs, tile);
  if (!pair) {
    return undefined;
  }
  const number =
    pairs
      .filter((other) => sameKind(tileAt(tiles, other.a), tile.__typename))
      .indexOf(pair) + 1;
  return { number, end: samePosition(pair.a, tile) ? 1 : 2 };
}
