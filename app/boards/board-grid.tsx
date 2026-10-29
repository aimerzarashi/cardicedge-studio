"use client";

import {
  type CSSProperties,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type Connection,
  connectionBetween,
  hasConnection,
  isPairableKind,
  type Mark,
  type MarkKind,
  type Pair,
  type PairLabel,
  PLACEMENTS,
  type Position,
  pairLabel,
  samePosition,
  type Tile,
  tileAt,
  tileLabel,
} from "./board-layout";

// ボードを斜め見下ろしで見せる格子。studio（表示・編集）と game#9 で共通の土台で、game#9 にそのまま写す。
//
// 並べ方: 幅 W・高さ H のボードを (2W−1) 列 × (2H−1) 行の CSS grid にし、偶数の位置をマス、奇数の位置を隣どうしの間の印
// （つながり）にする（奇数 × 奇数は空き）。この grid 全体を `scaleY(0.5) rotate(45deg)` で回してつぶし、マスを ◇ に見せる。
//   マス: 名前「(x, y) のマス」＋置いてあれば種類（土地は属性つき。例: 「(2, 0) のマス 拠点」「(1, 0) のマス 火属性の土地」）。種類・属性は色で見せる。
//     マスの中に文字を書くのは特殊なマスだけ（転送円・橋は対の番号「1-1」「1-2」、相手のいないものは「?」。施設は 1 文字）。名前にも番号が付く（「転送円 1-1」「橋 相手なし」）
//   横の間: 「(x, y) と (x+1, y) のつながり」、縦の間: 「(x, y) と (x, y+1) のつながり」（つながっているかは aria-pressed）
// 見方: はみ出した分はスクロールバーではなく、枠の中で表示を動かして見る（ドラッグで動かす・ホイールとボタンで拡大縮小）。
// 編集の操作はこの部品に持たせず、押されたときの処理（onTile・onConnection）だけを外から受ける。渡さなければ表示だけになる。
// 対: pairs で転送円・橋の番号を決める（番号の振り方は board-layout.ts の pairLabel）。pending は編集で相手待ちのマス（白い点線の枠）。
// 印: marks のマスに、種類ごとの枠（色と線の形）を付ける。マスの色（属性・拠点・チェックポイント）とぶつからないよう、枠で見せる。
//   focus に渡した位置は枠を太くして光らせ、渡されるたびに先頭のマスが枠の中央に来るよう表示を動かす（倍率は変えない）。
//   どの理由の印か・どのマスへ動くかは外が決める（この部品は理由を知らない）。game に写すときは marks・focus を渡さなければ何も変わらない
// onClick を持つため、Server Component（表示だけの詳細）からも使えるよう Client Component にしている

// マスの一辺とつながりの幅（px）。回す前の grid の大きさの計算にも使う
const TILE = 48;
const LINK = 20;

// 拡大の上限・下限は表示の都合の値で、core の決まりではない（ボードの大きさの範囲は core の studioRules.board）
const MIN_SCALE = 0.05;
const MAX_SCALE = 4;
const ZOOM_STEP = 1.25;
// 拡大・縮小で新しい倍率へ動く時間（ms）。続けて回したときも、動いている途中から次へ向かう
const ZOOM_DURATION = 200;
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

// 倍率を変えずに、マスの中心を枠の中央へ動かす（回す前の grid の中の中心を、fitView と同じ変換で枠の座標へ移す）
function centerOn(view: View, size: Size, position: Position): View {
  const cx = position.x * (TILE + LINK) + TILE / 2;
  const cy = position.y * (TILE + LINK) + TILE / 2;
  return {
    scale: view.scale,
    x: size.width / 2 - (view.scale * (cx - cy)) / Math.SQRT2,
    y: size.height / 2 - (view.scale * (cx + cy)) / Math.SQRT2 / 2,
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
  pairs,
  pending,
  marks = [],
  focus,
  onTile,
  onConnection,
}: {
  width: number;
  height: number;
  tiles: Tile[];
  connections: Connection[];
  pairs: Pair[];
  pending?: Position;
  marks?: Mark[];
  // 渡し直すたびに（中身が同じでも）、先頭の位置へ動いて目立たせる
  focus?: Position[];
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
  // 拡大・縮小・全体を表示は、新しい倍率と位置へなめらかに動かす（カメラワーク）。最初に開いたときは収まる位置にそのまま出し、
  // ドラッグの最中は指やマウスにそのまま付いてくるよう遅らせない
  const [animated, setAnimated] = useState(false);
  const [dragging, setDragging] = useState(false);

  const [seenFocus, setSeenFocus] = useState(focus);
  const fitted = size ? fitView(size, width, height) : null;
  const shown = view ?? fitted;

  if (focus !== seenFocus) {
    setSeenFocus(focus);
    if (focus?.[0] && size && shown) {
      setAnimated(true);
      setView(centerOn(shown, size, focus[0]));
    }
  }

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
      setAnimated(true);
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
    setAnimated(true);
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
      setDragging(true);
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
    setDragging(false);
  }

  const cells = [];
  for (let row = 0; row < 2 * height - 1; row++) {
    for (let column = 0; column < 2 * width - 1; column++) {
      const key = `${column}-${row}`;
      const x = Math.floor(column / 2);
      const y = Math.floor(row / 2);
      if (column % 2 === 0 && row % 2 === 0) {
        const tile = tileAt(tiles, { x, y });
        cells.push(
          <TileButton
            key={key}
            position={{ x, y }}
            tile={tile}
            pair={tile && pairLabel({ tiles, pairs }, tile)}
            waiting={pending !== undefined && samePosition(pending, { x, y })}
            marks={marks.filter((mark) => samePosition(mark, { x, y }))}
            focused={focus?.some((p) => samePosition(p, { x, y })) ?? false}
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
        <button
          type="button"
          onClick={() => {
            setAnimated(true);
            setView(null);
          }}
        >
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
          // 画面のモード（ダーク・通常）によらず暗い色に固定する。ボードはゲームの画面と同じ見え方にし、白いつながりの印を目立たせるため
          background: BOARD_BACKGROUND,
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
            transition:
              animated && !dragging
                ? `transform ${ZOOM_DURATION}ms ease-out`
                : "none",
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
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          listStyle: "none",
          padding: 0,
        }}
      >
        {LEGEND.map((sample) => (
          <li key={tileLabel(sample)}>
            <span
              aria-hidden
              style={{
                ...paint(sample),
                display: "inline-block",
                boxSizing: "border-box",
                width: "1em",
                height: "1em",
                marginRight: "0.25em",
                verticalAlign: "middle",
              }}
            />
            {tileLabel(sample)}
          </li>
        ))}
      </ul>
      {(marks.length > 0 || pending !== undefined) && (
        <ul
          aria-label="印"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "1rem",
            listStyle: "none",
            padding: 0,
          }}
        >
          {(Object.keys(MARK_STYLES) as MarkKind[])
            .filter((kind) => marks.some((mark) => mark.kind === kind))
            .map((kind) => (
              <li key={kind}>
                <span
                  aria-hidden
                  style={{
                    ...markOutline(kind, false),
                    display: "inline-block",
                    boxSizing: "border-box",
                    width: "1em",
                    height: "1em",
                    marginRight: "0.25em",
                    verticalAlign: "middle",
                  }}
                />
                {MARK_STYLES[kind].legend}
              </li>
            ))}
          {pending !== undefined && (
            <li>
              <span
                aria-hidden
                style={{
                  border: "3px dotted #ffffff",
                  background: BOARD_BACKGROUND,
                  display: "inline-block",
                  boxSizing: "border-box",
                  width: "1em",
                  height: "1em",
                  marginRight: "0.25em",
                  verticalAlign: "middle",
                }}
              />
              相手待ちの枠
            </li>
          )}
        </ul>
      )}
    </fieldset>
  );
}

// マス・間・マス…の並び。幅 1 のとき `repeat(0, …)` は CSS として無効になるため、repeat を使わずに並べる
function tracks(count: number, tile: number): string {
  return Array.from({ length: 2 * count - 1 }, (_, i) =>
    i % 2 === 0 ? `${tile}px` : `${LINK}px`,
  ).join(" ");
}

// 属性の色。拠点・チェックポイントは属性に使わない色（紫・明るめの桃色）にして、土地と見分ける。
// 枠の模様（二重の枠・斜線）で分ける案は、斜め見下ろしでつぶすと見分けにくいため採らなかった。
// 白はつながりの印に使うので、マスには使わない
const FIRE = "#d9534f";
const EARTH = "#5fae5f";
const WATER = "#4a7fd4";
const WIND = "#c8a24a";
const LAND_COLORS = {
  FIRE,
  EARTH,
  WATER,
  WIND,
  NEUTRAL: "#9e9e9e",
  // 4 色を 4 つに分けて塗る
  MULTI: `conic-gradient(${FIRE} 0 25%, ${EARTH} 0 50%, ${WATER} 0 75%, ${WIND} 0)`,
};
const BASE_COLOR = "#8e4ec6";
const CHECKPOINT_COLOR = "#f7a8c8";
const WARP_COLOR = "#20b2aa";
const BRIDGE_COLOR = "#8b5a2b";
const FACILITY_COLOR = "#3a3f55";
// 施設のマスに書く 1 文字
const FACILITY_GLYPHS = {
  SanctuaryTile: "聖",
  ShrineTile: "祠",
  ProphecyShopTile: "占",
  CardShopTile: "店",
};
const BOARD_BACKGROUND = "#1b2440";
const CONNECTED = "#ffffff";
const DISCONNECTED = "#4a5470";

// 凡例は、道具と同じ並びのマスの見本（置く道具と同じ PLACEMENTS から作る）
const LEGEND: Tile[] = PLACEMENTS.map((placement) => ({
  x: 0,
  y: 0,
  ...placement,
}));

function paint(tile: Tile | undefined): CSSProperties {
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
function tileText(tile: Tile, pair: PairLabel | undefined): string | undefined {
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
const MARK_STYLES: Record<
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

function markOutline(kind: MarkKind, focused: boolean): CSSProperties {
  const { color, line } = MARK_STYLES[kind];
  return {
    outline: `${focused ? 5 : 3}px ${line} ${color}`,
    outlineOffset: 2,
    boxShadow: focused ? `0 0 14px 6px ${color}` : undefined,
  };
}

// 1 つのマスに理由が重なる（相手のいない転送円がつながっておらず、行けないマスでもある等）ときは、
// 2 つめからを outline の外側の輪（box-shadow）で重ねる。outline は 1 本しか引けず、先頭だけだと残りの理由が見えないため
function markStyle(marks: Mark[], focused: boolean): CSSProperties {
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

function TileButton({
  position,
  tile,
  pair,
  waiting,
  marks,
  focused,
  onTile,
}: {
  position: Position;
  tile: Tile | undefined;
  // 転送円・橋の対の番号（対になっていなければ無い）
  pair: PairLabel | undefined;
  // 編集で相手待ちに選んでいるマス
  waiting: boolean;
  marks: Mark[];
  focused: boolean;
  onTile?: (position: Position) => void;
}) {
  const name = `(${position.x}, ${position.y}) のマス`;
  const text = tile && tileText(tile, pair);
  // 転送円・橋の名前には対の番号（なければ「相手なし」）を添える
  const pairName =
    tile && isPairableKind(tile.__typename)
      ? ` ${pair ? `${pair.number}-${pair.end}` : "相手なし"}`
      : "";
  return (
    <button
      type="button"
      aria-label={`${tile ? `${name} ${tileLabel(tile)}${pairName}` : name}${waiting ? "（相手待ち）" : ""}${marks.map((mark) => `（${mark.label}）`).join("")}`}
      data-mark={marks.map((mark) => mark.kind).join(" ") || undefined}
      data-focused={focused || undefined}
      data-waiting={waiting || undefined}
      disabled={onTile === undefined}
      onClick={() => onTile?.(position)}
      style={{
        ...paint(tile),
        // 相手待ちは白い点線の枠。印は outline なので重ねて出せる
        ...(waiting && { border: "3px dotted #ffffff" }),
        ...markStyle(marks, focused),
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {text !== undefined && (
        // 盤面の回転（scaleY(0.5) rotate(45deg)）を打ち消して、文字を正面に向ける
        <span
          aria-hidden
          style={{
            transform: "rotate(-45deg) scaleY(2)",
            color: "#ffffff",
            fontSize: 16,
            fontWeight: "bold",
            lineHeight: 1,
            textShadow: "0 0 2px #000, 0 0 2px #000",
            whiteSpace: "nowrap",
          }}
        >
          {text}
        </span>
      )}
    </button>
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
        // 細い棒で、つながっているときは白で目立たせる（間のマスが無い印は薄くして押せないことを示す）
        background: connected ? CONNECTED : DISCONNECTED,
        opacity: bothEnds ? 1 : 0.2,
        margin: vertical ? `0 ${(TILE - 16) / 2}px` : `${(TILE - 16) / 2}px 0`,
      }}
    />
  );
}
