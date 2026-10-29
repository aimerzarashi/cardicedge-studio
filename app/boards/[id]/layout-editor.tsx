"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { BOARD_CHECK_FAILED } from "../../messages";
import { BoardGrid } from "../board-grid";
import {
  type Cells,
  type Connection,
  isPairableKind,
  PLACEMENTS,
  type Placement,
  type Position,
  placeTile,
  pressPairable,
  removeTile,
  tileLabel,
  toggleConnection,
} from "../board-layout";
import {
  type PublishProblem,
  PublishProblemList,
  problemMarks,
} from "../publish-problems";
import { checkBoardLayout } from "./actions";
import {
  type ChangeLayoutState,
  connectionField,
  type LayoutError,
  layoutFormData,
  tileField,
} from "./layout-form";

// 操作が止まってから問い合わせるまでの待ち。1 クリックごとに core を呼ばないため
const CHECK_DELAY_MS = 300;

// 置く道具は置くマスの種類・属性を持ち、消す道具は持たない
type Tool = { value: string; label: string; placement?: Placement };

const TOOLS: Tool[] = [
  ...PLACEMENTS.map((placement) => ({
    value: tileLabel(placement),
    label: tileLabel(placement),
    placement,
  })),
  { value: "消す", label: "消す" },
];

const initialState: ChangeLayoutState = {};

// 編集中のレイアウトは保存するまでこの部品の状態（入力中の値）だけで持つ。保存の結果と誤りは Server Action の状態で、
// 編集中の値は版（revision）で作り直す内側の部品が持つ
export function LayoutEditor({
  action,
  id,
  revision,
  width,
  height,
  sizeRange,
  tiles,
  connections,
  pairs,
  problems,
}: {
  action: (
    previous: ChangeLayoutState,
    form: FormData,
  ) => Promise<ChangeLayoutState>;
  id: string;
  revision: number;
  width: number;
  height: number;
  // 幅・高さの範囲は core の studioRules.board から受け取った値（studio に書き写さない）
  sizeRange: { min: number; max: number };
  tiles: Cells["tiles"];
  connections: Cells["connections"];
  pairs: Cells["pairs"];
  // 保存した形での、公開できない理由（core が返したもの）
  problems: PublishProblem[];
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const kept = state.revision === revision ? state : {};

  return (
    <>
      {state.status && <p role="status">{state.status}</p>}
      {state.error && <p role="alert">{state.error}</p>}
      {kept.layoutErrors && (
        <ul role="alert">
          {kept.layoutErrors.map((error) => (
            <li key={error.message}>{error.message}</li>
          ))}
        </ul>
      )}
      {/* 版が変わったら作り直し、最新のレイアウトから編集し直す（古い版で編集した値を残さない） */}
      <LayoutForm
        key={revision}
        formAction={formAction}
        isPending={isPending}
        id={id}
        revision={revision}
        sizeRange={sizeRange}
        initial={{ width, height, tiles, connections, pairs }}
        problems={problems}
      />
    </>
  );
}

function LayoutForm({
  formAction,
  isPending,
  id,
  revision,
  sizeRange,
  initial,
  problems: initialProblems,
}: {
  formAction: (form: FormData) => void;
  isPending: boolean;
  id: string;
  revision: number;
  sizeRange: { min: number; max: number };
  initial: Cells & { width: number; height: number };
  problems: PublishProblem[];
}) {
  const [cells, setCells] = useState<Cells>({
    tiles: initial.tiles,
    connections: initial.connections,
    pairs: initial.pairs,
  });
  // 転送円・橋の道具で、対にする相手を待っているマス。画面の中だけの状態で、開いた直後と道具を変えたときは無い
  const [pending, setPending] = useState<Position>();
  // 幅・高さは入力中の文字のまま持つ。整数で範囲の中になるまでは、格子を直前の大きさのままにする（範囲の外の値で描くと、桁違いの数のボタンで固まる）
  const [size, setSize] = useState({
    width: String(initial.width),
    height: String(initial.height),
  });
  const [grid, setGrid] = useState({
    width: initial.width,
    height: initial.height,
  });
  const [tool, setTool] = useState<Tool>(TOOLS[0]);
  const [focus, setFocus] = useState<Position[]>();

  // 一覧と印は、開いた直後と保存した直後は core が返した保存済みの形のもの。編集すると、止まってから core に問い合わせた結果に変わる。
  // 判定は core の 1 か所のまま（studio に書き写さない）。useEffect でなく操作の中で予約するのは、データの読み込みではなく操作への反応のため
  const [check, setCheck] = useState<{
    problems: PublishProblem[];
    errors: LayoutError[];
    failed?: string;
  }>({ problems: initialProblems, errors: [] });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // 古い問い合わせの結果が後から届いても、新しい結果を上書きしないための番号
  const latest = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  function scheduleCheck(nextSize: typeof size, nextCells: Cells) {
    clearTimeout(timer.current);
    latest.current += 1;
    const order = latest.current;
    timer.current = setTimeout(async () => {
      const result = await checkBoardLayout(
        layoutFormData(nextSize, nextCells),
      ).catch(() => undefined);
      if (order !== latest.current || result?.kind === "ignored") {
        return;
      }
      setCheck((current) => {
        switch (result?.kind) {
          case "problems":
            return { problems: result.problems, errors: [] };
          case "invalid":
            return { problems: [], errors: result.errors };
          case "failed":
            return { ...current, failed: result.message };
          default:
            return { ...current, failed: BOARD_CHECK_FAILED };
        }
      });
    }, CHECK_DELAY_MS);
  }

  function inRange(text: string, current: number): number {
    const value = Number(text);
    return text.trim() !== "" &&
      Number.isInteger(value) &&
      value >= sizeRange.min &&
      value <= sizeRange.max
      ? value
      : current;
  }

  function changeSize(next: { width: string; height: string }) {
    setSize(next);
    scheduleCheck(next, cells);
    setGrid((current) => ({
      width: inRange(next.width, current.width),
      height: inRange(next.height, current.height),
    }));
  }

  function pressTile(position: Position) {
    let next: Cells;
    if (tool.placement && isPairableKind(tool.placement.__typename)) {
      const pressed = pressPairable(
        cells,
        position,
        tool.placement.__typename,
        pending,
      );
      next = pressed.cells;
      setPending(pressed.pending);
    } else {
      next = tool.placement
        ? placeTile(cells, position, tool.placement)
        : removeTile(cells, position);
    }
    setCells(next);
    scheduleCheck(size, next);
  }

  function pressConnection(connection: Connection) {
    const next = toggleConnection(cells, connection);
    setCells(next);
    scheduleCheck(size, next);
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="revision" value={revision} />
      {cells.tiles.map((tile) => (
        <input
          key={`${tile.x},${tile.y}`}
          type="hidden"
          name="tile"
          value={tileField(tile)}
        />
      ))}
      {cells.connections.map((connection) => (
        <input
          key={connectionField(connection)}
          type="hidden"
          name="connection"
          value={connectionField(connection)}
        />
      ))}
      {cells.pairs.map((pair) => (
        <input
          key={connectionField(pair)}
          type="hidden"
          name="pair"
          value={connectionField(pair)}
        />
      ))}
      <label>
        幅
        <input
          type="number"
          name="width"
          step={1}
          min={sizeRange.min}
          max={sizeRange.max}
          required
          value={size.width}
          onChange={(e) => changeSize({ ...size, width: e.target.value })}
        />
      </label>
      <label>
        高さ
        <input
          type="number"
          name="height"
          step={1}
          min={sizeRange.min}
          max={sizeRange.max}
          required
          value={size.height}
          onChange={(e) => changeSize({ ...size, height: e.target.value })}
        />
      </label>
      <fieldset>
        <legend>道具</legend>
        {TOOLS.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name="tool"
              value={option.value}
              checked={tool.value === option.value}
              onChange={() => {
                setTool(option);
                setPending(undefined);
              }}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      {/* section にしないのは、名前に「公開」を含む領域になり、「公開」の節の取り違えになるため */}
      <div>
        <h3>公開できない理由</h3>
        {check.failed && <p role="status">{check.failed}</p>}
        {check.errors.length > 0 ? (
          <ul aria-label="レイアウトの誤り">
            {check.errors.map((error) => (
              <li key={error.message}>{error.message}</li>
            ))}
          </ul>
        ) : (
          <PublishProblemList problems={check.problems} onSelect={setFocus} />
        )}
      </div>
      <BoardGrid
        width={grid.width}
        height={grid.height}
        tiles={cells.tiles}
        connections={cells.connections}
        pairs={cells.pairs}
        pending={pending}
        marks={problemMarks(check.problems)}
        focus={focus}
        onTile={pressTile}
        onConnection={pressConnection}
      />
      <button type="submit" disabled={isPending}>
        レイアウトを保存
      </button>
    </form>
  );
}
