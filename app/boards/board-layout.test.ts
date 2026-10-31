import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type Cells,
  connectionBetween,
  PLACEMENTS,
  type Placement,
  type Position,
  pairLabel,
  placeTile,
  pressPairable,
  removeTile,
  sizeToFit,
  tileAt,
  tileLabel,
  toggleConnection,
} from "./board-layout.ts";

const empty: Cells = { tiles: [], connections: [], pairs: [] };
const fire: Placement = { __typename: "LandTile", attribute: "FIRE" };
const water: Placement = { __typename: "LandTile", attribute: "WATER" };
const warp: Placement = { __typename: "WarpTile" };
const bridge: Placement = { __typename: "BridgeTile" };

const at = (x: number, y: number): Position => ({ x, y });

// 同じ種類の道具で、順にマスを置く
function put(cells: Cells, placement: Placement, ...positions: Position[]) {
  return positions.reduce(
    (current, position) => placeTile(current, position, placement),
    cells,
  );
}

// 置いてあるマスの対の番号。マスが無ければテストの前提が崩れているので投げる
function labelAt(cells: Cells, x: number, y: number) {
  const tile = tileAt(cells.tiles, at(x, y));
  if (!tile) {
    throw new Error(`(${x}, ${y}) にマスがありません`);
  }
  return pairLabel(cells, tile);
}

// 転送円（橋）の道具で、順にマスを押す
function press(
  cells: Cells,
  kind: "WarpTile" | "BridgeTile",
  ...positions: Position[]
) {
  let state: { cells: Cells; pending: Position | undefined } = {
    cells,
    pending: undefined,
  };
  for (const position of positions) {
    state = pressPairable(state.cells, position, kind, state.pending);
  }
  return state;
}

describe("PLACEMENTS（道具・凡例の並び）", () => {
  it("拠点・チェックポイント・土地 6 つ・転送円・橋・施設 4 つの順に並ぶ", () => {
    assert.deepEqual(PLACEMENTS.map(tileLabel), [
      "拠点",
      "チェックポイント",
      "火属性の土地",
      "地属性の土地",
      "水属性の土地",
      "風属性の土地",
      "無属性の土地",
      "複属性の土地",
      "転送円",
      "橋",
      "聖堂",
      "ほこら",
      "占い館",
      "カード屋",
    ]);
  });
});

describe("placeTile", () => {
  it("新しく置いたマスは、隣に置いてあるマスと自動でつながる", () => {
    const cells = put(empty, fire, at(0, 0), at(1, 0), at(1, 1));

    assert.deepEqual(cells.connections, [
      connectionBetween(at(1, 0), at(0, 0)),
      connectionBetween(at(1, 1), at(1, 0)),
    ]);
  });

  it("離れたマスはつながらない", () => {
    const cells = put(empty, fire, at(0, 0), at(2, 0));

    assert.deepEqual(cells.connections, []);
  });

  it("つながりの a は座標が小さい側（行、同じ行なら列の順）にそろう", () => {
    const cells = put(empty, fire, at(1, 1), at(1, 0), at(0, 1));

    assert.deepEqual(cells.connections, [
      { a: at(1, 0), b: at(1, 1) },
      { a: at(0, 1), b: at(1, 1) },
    ]);
  });

  it("属性だけが違う道具で上書きすると、属性が変わり、つながりは残る", () => {
    const cells = placeTile(
      put(empty, fire, at(0, 0), at(1, 0)),
      at(1, 0),
      water,
    );

    assert.deepEqual(tileAt(cells.tiles, at(1, 0)), { ...at(1, 0), ...water });
    assert.equal(cells.tiles.length, 2);
    assert.deepEqual(cells.connections, [
      connectionBetween(at(0, 0), at(1, 0)),
    ]);
  });

  it("切ったつながりは、置き直しで戻らない", () => {
    const connected = put(empty, fire, at(0, 0), at(1, 0));
    const cut = toggleConnection(
      connected,
      connectionBetween(at(0, 0), at(1, 0)),
    );

    const cells = placeTile(cut, at(1, 0), water);

    assert.deepEqual(cells.connections, []);
  });

  it("対になっている転送円を別の種類で上書きすると、その端の対が切れ、もう一方は相手のいないまま残る", () => {
    const { cells: paired } = press(empty, "WarpTile", at(0, 0), at(2, 0));

    const cells = placeTile(paired, at(0, 0), water);

    assert.deepEqual(cells.pairs, []);
    assert.equal(tileAt(cells.tiles, at(2, 0))?.__typename, "WarpTile");
  });

  it("同じ種類への置き直しは対を残す", () => {
    const { cells: paired } = press(empty, "WarpTile", at(0, 0), at(2, 0));

    const cells = placeTile(paired, at(0, 0), warp);

    assert.equal(cells.pairs.length, 1);
  });
});

describe("removeTile", () => {
  it("マスを消すと、そのマスのつながりも消える", () => {
    const line = put(empty, fire, at(0, 0), at(1, 0), at(2, 0));

    const cells = removeTile(line, at(1, 0));

    assert.equal(tileAt(cells.tiles, at(1, 0)), undefined);
    assert.deepEqual(cells.connections, []);
    assert.equal(cells.tiles.length, 2);
  });

  it("消したマスに置き直すと、隣とまたつながる", () => {
    const line = put(empty, fire, at(0, 0), at(1, 0), at(2, 0));

    const cells = placeTile(removeTile(line, at(1, 0)), at(1, 0), fire);

    assert.deepEqual(cells.connections, [
      connectionBetween(at(0, 0), at(1, 0)),
      connectionBetween(at(1, 0), at(2, 0)),
    ]);
  });

  it("対の片方を消すと、対が切れ、もう一方は相手のいない転送円として残る", () => {
    const { cells: paired } = press(empty, "WarpTile", at(0, 0), at(2, 0));

    const cells = removeTile(paired, at(0, 0));

    assert.deepEqual(cells.pairs, []);
    assert.equal(tileAt(cells.tiles, at(2, 0))?.__typename, "WarpTile");
    assert.equal(labelAt(cells, 2, 0), undefined);
  });
});

describe("toggleConnection", () => {
  const link = connectionBetween(at(0, 0), at(1, 0));

  it("つながっていれば切る", () => {
    const connected = put(empty, fire, at(0, 0), at(1, 0));

    assert.deepEqual(toggleConnection(connected, link).connections, []);
  });

  it("切れていればつなぐ", () => {
    const cut = toggleConnection(put(empty, fire, at(0, 0), at(1, 0)), link);

    assert.deepEqual(toggleConnection(cut, link).connections, [link]);
  });
});

describe("sizeToFit", () => {
  it("マスが無ければ 0", () => {
    assert.deepEqual(sizeToFit([]), { width: 0, height: 0 });
  });

  it("置いてあるマスがすべて収まる最小の幅・高さ（一番右の列 + 1・一番下の行 + 1）", () => {
    const cells = put(empty, fire, at(5, 0), at(1, 3));

    assert.deepEqual(sizeToFit(cells.tiles), { width: 6, height: 4 });
  });
});

describe("pressPairable（転送円・橋の対の編集）", () => {
  it("空きを押すと置いて相手待ちにし、次に空きを押すと対にする", () => {
    const first = press(empty, "WarpTile", at(0, 0));

    assert.deepEqual(first.pending, at(0, 0));
    assert.equal(tileAt(first.cells.tiles, at(0, 0))?.__typename, "WarpTile");
    assert.deepEqual(first.cells.pairs, []);

    const second = pressPairable(
      first.cells,
      at(3, 3),
      "WarpTile",
      first.pending,
    );

    assert.equal(second.pending, undefined);
    assert.deepEqual(second.cells.pairs, [
      connectionBetween(at(0, 0), at(3, 3)),
    ]);
  });

  it("対の a は座標が小さい側で、押した順によらない", () => {
    const { cells } = press(empty, "WarpTile", at(3, 3), at(0, 0));

    assert.deepEqual(cells.pairs, [{ a: at(0, 0), b: at(3, 3) }]);
  });

  it("相手待ちのまま同じものをもう一度押すと、相手待ちをやめる（相手のいない転送円のまま）", () => {
    const { cells, pending } = press(empty, "WarpTile", at(0, 0), at(0, 0));

    assert.equal(pending, undefined);
    assert.deepEqual(cells.pairs, []);
    assert.equal(tileAt(cells.tiles, at(0, 0))?.__typename, "WarpTile");
  });

  it("相手待ちが無いとき、相手のいない転送円を押すと相手待ちに選び直せる", () => {
    const stopped = press(empty, "WarpTile", at(0, 0), at(0, 0));

    const again = pressPairable(stopped.cells, at(0, 0), "WarpTile", undefined);

    assert.deepEqual(again.pending, at(0, 0));
    assert.deepEqual(again.cells, stopped.cells);
  });

  it("相手待ちの別の相手のいない転送円を押すと、その 2 つが対になる", () => {
    let state = press(empty, "WarpTile", at(0, 0), at(0, 0));
    state = press(state.cells, "WarpTile", at(2, 0));
    state = pressPairable(state.cells, at(2, 0), "WarpTile", state.pending);
    assert.equal(state.pending, undefined);
    assert.equal(tileAt(state.cells.tiles, at(0, 0))?.__typename, "WarpTile");
    assert.deepEqual(state.cells.pairs, []);

    const picked = pressPairable(state.cells, at(0, 0), "WarpTile", undefined);
    const paired = pressPairable(
      picked.cells,
      at(2, 0),
      "WarpTile",
      picked.pending,
    );

    assert.deepEqual(paired.cells.pairs, [{ a: at(0, 0), b: at(2, 0) }]);
  });

  it("対になっているものを押しても、何も起きず、相手待ちも変わらない", () => {
    const paired = press(empty, "WarpTile", at(0, 0), at(2, 0));
    const waiting = pressPairable(
      paired.cells,
      at(4, 0),
      "WarpTile",
      undefined,
    );

    const pressed = pressPairable(
      waiting.cells,
      at(0, 0),
      "WarpTile",
      waiting.pending,
    );

    assert.deepEqual(pressed.cells, waiting.cells);
    assert.deepEqual(pressed.pending, at(4, 0));
  });

  it("相手待ちの転送円で橋を押すと、橋は転送円に替わって対の相手になり、橋の対は切れる", () => {
    let state = press(empty, "BridgeTile", at(0, 0), at(2, 0));
    state = pressPairable(state.cells, at(4, 0), "WarpTile", undefined);

    const pressed = pressPairable(
      state.cells,
      at(0, 0),
      "WarpTile",
      state.pending,
    );

    assert.equal(tileAt(pressed.cells.tiles, at(0, 0))?.__typename, "WarpTile");
    assert.deepEqual(pressed.cells.pairs, [{ a: at(0, 0), b: at(4, 0) }]);
    const leftover = tileAt(pressed.cells.tiles, at(2, 0));
    assert.equal(leftover?.__typename, "BridgeTile");
    assert.equal(labelAt(pressed.cells, 2, 0), undefined);
  });

  it("相手待ちが、もう相手のいない同じ種類のマスでなければ、相手待ちとして扱わない", () => {
    const first = press(empty, "WarpTile", at(0, 0));
    const overwritten = placeTile(first.cells, at(0, 0), fire);

    const pressed = pressPairable(
      overwritten,
      at(2, 0),
      "WarpTile",
      first.pending,
    );

    assert.deepEqual(pressed.cells.pairs, []);
    assert.deepEqual(pressed.pending, at(2, 0));
  });
});

describe("pairLabel（転送円・橋の番号）", () => {
  it("転送円と橋で別に、対ごとに 1 から振り、端は a が 1・b が 2", () => {
    let cells = press(
      empty,
      "WarpTile",
      at(0, 0),
      at(2, 0),
      at(4, 0),
      at(6, 0),
    ).cells;
    cells = press(cells, "BridgeTile", at(0, 2), at(2, 2)).cells;

    const label = (x: number, y: number) => labelAt(cells, x, y);

    assert.deepEqual(label(0, 0), { number: 1, end: 1 });
    assert.deepEqual(label(2, 0), { number: 1, end: 2 });
    assert.deepEqual(label(4, 0), { number: 2, end: 1 });
    assert.deepEqual(label(6, 0), { number: 2, end: 2 });
    assert.deepEqual(label(0, 2), { number: 1, end: 1 });
    assert.deepEqual(label(2, 2), { number: 1, end: 2 });
  });

  it("番号は cells.pairs の並びで振り、座標では並べ替えない", () => {
    const tiles = [at(0, 0), at(2, 0), at(4, 0), at(6, 0)].map((p) => ({
      ...p,
      ...warp,
    }));
    const pairs = [
      { a: at(4, 0), b: at(6, 0) },
      { a: at(0, 0), b: at(2, 0) },
    ];

    assert.deepEqual(pairLabel({ tiles, pairs }, tiles[0]), {
      number: 2,
      end: 1,
    });
    assert.deepEqual(pairLabel({ tiles, pairs }, tiles[2]), {
      number: 1,
      end: 1,
    });
  });

  it("相手のいないものは番号を持たない", () => {
    const { cells } = press(empty, "WarpTile", at(0, 0));

    assert.equal(labelAt(cells, 0, 0), undefined);
  });

  it("対の片方を消すか別の種類で上書きすると、残った 2 つの番号は無くなる", () => {
    let cells = press(
      empty,
      "WarpTile",
      at(0, 0),
      at(2, 0),
      at(4, 0),
      at(6, 0),
    ).cells;
    cells = removeTile(cells, at(0, 0));
    cells = placeTile(cells, at(4, 0), water);

    assert.equal(labelAt(cells, 2, 0), undefined);
    assert.equal(labelAt(cells, 6, 0), undefined);
  });
});

describe("tileLabel", () => {
  it("土地は属性つきの名前で呼ぶ", () => {
    assert.equal(tileLabel(fire), "火属性の土地");
    assert.equal(tileLabel(bridge), "橋");
  });
});
