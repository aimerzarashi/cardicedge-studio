"use client";

import { type PointerEvent, useEffect, useRef, useState } from "react";
import {
  type Connection,
  connectionBetween,
  hasConnection,
  type Position,
  TILE_KIND_LABELS,
  type Tile,
  tileAt,
} from "./board-layout";

// ボードを斜め見下ろしで見せる格子。studio（表示・編集）と game#9 で共通の土台で、game#9 にそのまま写す。
//
// 並べ方: 幅 W・高さ H のボードを (2W−1) 列 × (2H−1) 行の CSS grid にし、偶数の位置をマス、奇数の位置を隣どうしの間の印
// （つながり）にする（奇数 × 奇数は空き）。この grid 全体を `scaleY(0.5) rotate(45deg)` で回してつぶし、マスを ◇ に見せる。
//   マス: 名前「(x, y) のマス」＋置いてあれば種類（例: 「(2, 0) のマス 拠点」）。種類は色で見せ、マスの中に文字は書かない
//   横の間: 「(x, y) と (x+1, y) のつながり」、縦の間: 「(x, y) と (x, y+1) のつながり」（つながっているかは aria-pressed）
// 見方: はみ出した分はスクロールバーではなく、枠の中で表示を動かして見る（ドラッグで動かす・ホイールとボタンで拡大縮小）。
// 編集の操作はこの部品に持たせず、押されたときの処理（onTile・onConnection）だけを外から受ける。渡さなければ表示だけになる。
// onClick を持つため、Server Component（表示だけの詳細）からも使えるよう Client Component にしている

// マスの一辺とつながりの幅（px）。回す前の grid の大きさの計算にも使う
const TILE = 48;
const LINK = 20;

// 拡大の上限・下限は表示の都合の値で、core の決まりではない（ボードの大きさの範囲は core の studioRules.board）
const MIN_SCALE = 0.05;
const MAX_SCALE = 4;
const ZOOM_STEP = 1.25;
// 押してからこの距離（px）動いたらドラッグ、動かずに離したらマス・つながりを押した扱い
const DRAG_THRESHOLD = 4;

type View = { scale: number; x: number; y: number };
type Size = { width: number; height: number };

const clamp = (scale: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

function span(count: number): number {
  return count * TILE + (count - 1) * LINK;
}

// grid の左上を原点に回すと、横は −gridH/√2 〜 gridW/√2、縦は 0 〜 (gridW+gridH)/(2√2) に広がる。その全体を枠の中央に収める
function fitView(size: Size, width: number, height: number): View {
  const gridW = span(width);
  const gridH = span(height);
  const boundsW = (gridW + gridH) / Math.SQRT2;
  const boundsH = boundsW / 2;
  const scale = clamp(
    Math.min(size.width / boundsW, size.height / boundsH) * 0.95,
  );
  return {
    scale,
    x: (size.width - scale * boundsW) / 2 + (scale * gridH) / Math.SQRT2,
    y: (size.height - scale * boundsH) / 2,
  };
}

// 点（枠の中の座標）を動かさずに倍率を変える
function zoomAt(view: View, factor: number, px: number, py: number): View {
  const scale = clamp(view.scale * factor);
  const k = scale / view.scale;
  return { scale, x: px - (px - view.x) * k, y: py - (py - view.y) * k };
}

export function BoardGrid({
  width,
  height,
  tiles,
  connections,
  onTile,
  onConnection,
}: {
  width: number;
  height: number;
  tiles: Tile[];
  connections: Connection[];
  onTile?: (position: Position) => void;
  onConnection?: (connection: Connection) => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size | null>(null);
  // null の間は、ボード全体が枠に収まる大きさで中央に置く
  const [view, setView] = useState<View | null>(null);
  const [dims, setDims] = useState({ width, height });
  if (dims.width !== width || dims.height !== height) {
    setDims({ width, height });
    setView(null);
  }
  const drag = useRef<{
    startX: number;
    startY: number;
    from: View;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);

  const fitted = size ? fitView(size, width, height) : null;
  const shown = view ?? fitted;

  // ホイールの既定のスクロールを止めるには passive でない listener が要り、React の onWheel では付けられないため DOM に付ける
  useEffect(() => {
    const element = viewport.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = viewport.current;
    if (!element || !size) {
      return;
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      setView((current) =>
        zoomAt(
          current ?? fitView(size, width, height),
          factor,
          event.clientX - rect.left,
          event.clientY - rect.top,
        ),
      );
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [size, width, height]);

  function zoom(factor: number) {
    if (!size || !shown) {
      return;
    }
    setView(zoomAt(shown, factor, size.width / 2, size.height / 2));
  }

  // pointer capture はドラッグと決まってから付ける。押した直後に付けると、押したマスの click が枠に移り、押せなくなる
  function pointerDown(event: PointerEvent) {
    if (event.button !== 0 || !shown) {
      return;
    }
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      from: shown,
      moved: false,
    };
  }

  function pointerMove(event: PointerEvent) {
    const d = drag.current;
    if (!d) {
      return;
    }
    const dx = event.clientX - d.startX;
    const dy = event.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      d.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (d.moved) {
      setView({ ...d.from, x: d.from.x + dx, y: d.from.y + dy });
    }
  }

  function pointerEnd() {
    if (drag.current?.moved) {
      // ドラッグの後に続く click をマス・つながりを押した扱いにしない。click が来なかった場合に残らないよう、すぐ戻す
      suppressClick.current = true;
      setTimeout(() => {
        suppressClick.current = false;
      }, 0);
    }
    drag.current = null;
  }

  const cells = [];
  for (let row = 0; row < 2 * height - 1; row++) {
    for (let column = 0; column < 2 * width - 1; column++) {
      const key = `${column}-${row}`;
      const x = Math.floor(column / 2);
      const y = Math.floor(row / 2);
      if (column % 2 === 0 && row % 2 === 0) {
        cells.push(
          <TileButton
            key={key}
            position={{ x, y }}
            tile={tileAt(tiles, { x, y })}
            onTile={onTile}
          />,
        );
      } else if (column % 2 === row % 2) {
        cells.push(<span key={key} />);
      } else {
        const connection = connectionBetween(
          { x, y },
          column % 2 === 1 ? { x: x + 1, y } : { x, y: y + 1 },
        );
        cells.push(
          <ConnectionButton
            key={key}
            connection={connection}
            vertical={row % 2 === 1}
            connected={hasConnection(connections, connection)}
            bothEnds={
              tileAt(tiles, connection.a) !== undefined &&
              tileAt(tiles, connection.b) !== undefined
            }
            onConnection={onConnection}
          />,
        );
      }
    }
  }

  return (
    // fieldset の既定の min-inline-size（min-content）だと、中身の幅に合わせて広がり、枠からはみ出して隠れるため 0 にする
    <fieldset
      aria-label="ボードの格子"
      style={{ border: "none", margin: 0, padding: 0, minInlineSize: 0 }}
    >
      <div>
        <button type="button" onClick={() => zoom(ZOOM_STEP)}>
          拡大
        </button>
        <button type="button" onClick={() => zoom(1 / ZOOM_STEP)}>
          縮小
        </button>
        <button type="button" onClick={() => setView(null)}>
          全体を表示
        </button>
      </div>
      <div
        ref={viewport}
        data-scale={shown ? shown.scale.toFixed(3) : undefined}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerEnd}
        onPointerCancel={pointerEnd}
        onClickCapture={(event) => {
          if (suppressClick.current) {
            event.stopPropagation();
            event.preventDefault();
          }
        }}
        style={{
          position: "relative",
          height: "28rem",
          // はみ出しはスクロールではなく隠す。clip は、フォーカスの移動でも勝手にスクロールされない
          overflow: "clip",
          touchAction: "none",
          userSelect: "none",
          border: "1px solid #999",
          // 枠の大きさが分かるまでは、収め方が決まらないため出さない
          visibility: shown ? "visible" : "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            display: "grid",
            gridTemplateColumns: tracks(width, TILE),
            gridTemplateRows: tracks(height, TILE),
            width: span(width),
            height: span(height),
            transformOrigin: "0 0",
            transform: shown
              ? `translate(${shown.x}px, ${shown.y}px) scale(${shown.scale}) scaleY(0.5) rotate(45deg)`
              : undefined,
          }}
        >
          {cells}
        </div>
      </div>
      <ul
        aria-label="凡例"
        style={{ display: "flex", gap: "1rem", listStyle: "none", padding: 0 }}
      >
        {(Object.keys(KIND_COLORS) as (keyof typeof KIND_COLORS)[]).map(
          (kind) => (
            <li key={kind}>
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: "1em",
                  height: "1em",
                  marginRight: "0.25em",
                  verticalAlign: "middle",
                  border: "1px solid #555",
                  background: KIND_COLORS[kind],
                }}
              />
              {TILE_KIND_LABELS[kind]}
            </li>
          ),
        )}
      </ul>
    </fieldset>
  );
}

// マス・間・マス…の並び。幅 1 のとき `repeat(0, …)` は CSS として無効になるため、repeat を使わずに並べる
function tracks(count: number, tile: number): string {
  return Array.from({ length: 2 * count - 1 }, (_, i) =>
    i % 2 === 0 ? `${tile}px` : `${LINK}px`,
  ).join(" ");
}

const KIND_COLORS = {
  LAND: "#cfe8c4",
  BASE: "#f4a6a6",
  CHECKPOINT: "#a9bff4",
};

function TileButton({
  position,
  tile,
  onTile,
}: {
  position: Position;
  tile: Tile | undefined;
  onTile?: (position: Position) => void;
}) {
  const name = `(${position.x}, ${position.y}) のマス`;
  return (
    <button
      type="button"
      aria-label={tile ? `${name} ${TILE_KIND_LABELS[tile.kind]}` : name}
      disabled={onTile === undefined}
      onClick={() => onTile?.(position)}
      style={{
        padding: 0,
        border: tile ? "1px solid #555" : "1px dashed #999",
        background: tile ? KIND_COLORS[tile.kind] : "transparent",
      }}
    />
  );
}

function ConnectionButton({
  connection,
  vertical,
  connected,
  bothEnds,
  onConnection,
}: {
  connection: Connection;
  vertical: boolean;
  connected: boolean;
  bothEnds: boolean;
  onConnection?: (connection: Connection) => void;
}) {
  const { a, b } = connection;
  return (
    <button
      type="button"
      aria-label={`(${a.x}, ${a.y}) と (${b.x}, ${b.y}) のつながり`}
      aria-pressed={connected}
      // 両側にマスが無いと、つなぐことも切ることもできない
      disabled={onConnection === undefined || !bothEnds}
      onClick={() => onConnection?.(connection)}
      style={{
        padding: 0,
        border: "none",
        // 細い棒で、つながっているときだけ塗る（間のマスが無い印は薄くして押せないことを示す）
        background: connected ? "#555" : "#ddd",
        opacity: bothEnds ? 1 : 0.2,
        margin: vertical ? `0 ${(TILE - 16) / 2}px` : `${(TILE - 16) / 2}px 0`,
      }}
    />
  );
}
