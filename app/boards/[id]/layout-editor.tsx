"use client";

import { useActionState, useState } from "react";
import type { BoardTileKind } from "@/graphql/graphql";
import { BoardGrid } from "../board-grid";
import {
  type Cells,
  type Connection,
  type Position,
  placeTile,
  removeTile,
  TILE_KIND_LABELS,
  toggleConnection,
} from "../board-layout";
import {
  type ChangeLayoutState,
  connectionField,
  tileField,
} from "./layout-form";

type Tool = BoardTileKind | "ERASE";

const TOOLS: { value: Tool; label: string }[] = [
  { value: "LAND", label: TILE_KIND_LABELS.LAND },
  { value: "BASE", label: TILE_KIND_LABELS.BASE },
  { value: "CHECKPOINT", label: TILE_KIND_LABELS.CHECKPOINT },
  { value: "ERASE", label: "消す" },
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
        result={kept}
        id={id}
        revision={revision}
        sizeRange={sizeRange}
        initial={{ width, height, tiles, connections }}
      />
    </>
  );
}

function LayoutForm({
  formAction,
  isPending,
  result,
  id,
  revision,
  sizeRange,
  initial,
}: {
  formAction: (form: FormData) => void;
  isPending: boolean;
  result: ChangeLayoutState;
  id: string;
  revision: number;
  sizeRange: { min: number; max: number };
  initial: Cells & { width: number; height: number };
}) {
  const [cells, setCells] = useState<Cells>({
    tiles: initial.tiles,
    connections: initial.connections,
  });
  // 幅・高さは入力中の文字のまま持つ。整数で範囲の中になるまでは、格子を直前の大きさのままにする（範囲の外の値で描くと、桁違いの数のボタンで固まる）
  const [size, setSize] = useState({
    width: String(initial.width),
    height: String(initial.height),
  });
  const [grid, setGrid] = useState({
    width: initial.width,
    height: initial.height,
  });
  const [tool, setTool] = useState<Tool>("LAND");
  // 誤りの印は保存した時点のレイアウトに対するもの。直したあとも残さないよう、編集したら外す
  const [shown, setShown] = useState(result);
  const [edited, setEdited] = useState(false);
  if (shown !== result) {
    setShown(result);
    setEdited(false);
  }
  const marks = edited ? [] : (result.layoutErrors ?? []);

  function edit(next: Cells) {
    setCells(next);
    setEdited(true);
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
    setGrid((current) => ({
      width: inRange(next.width, current.width),
      height: inRange(next.height, current.height),
    }));
  }

  function pressTile(position: Position) {
    edit(
      tool === "ERASE"
        ? removeTile(cells, position)
        : placeTile(cells, position, tool),
    );
  }

  function pressConnection(connection: Connection) {
    edit(toggleConnection(cells, connection));
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
              checked={tool === option.value}
              onChange={() => setTool(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
      <BoardGrid
        width={grid.width}
        height={grid.height}
        tiles={cells.tiles}
        connections={cells.connections}
        markedTiles={marks.flatMap((m) => (m.tile ? [m.tile] : []))}
        markedConnections={marks.flatMap((m) =>
          m.connection ? [m.connection] : [],
        )}
        onTile={pressTile}
        onConnection={pressConnection}
      />
      <button type="submit" disabled={isPending}>
        レイアウトを保存
      </button>
    </form>
  );
}
