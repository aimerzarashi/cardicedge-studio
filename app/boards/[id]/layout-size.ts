import { sizeToFit, type Tile } from "../board-layout.ts";

// 幅・高さの入力の判定。入力中の文字と今の大きさ・下限・上限から、格子を描く大きさと問い合わせるかを決める。
// 部品（layout-editor.tsx）と分けたのは、JSX を含む .tsx は node --test で読めず、単体テストにできないため。
// 範囲の上限・下限（rangeMin・max）は core の studioRules.board から受け取った値で、studio に書き写さない

export type SizeInput = { width: string; height: string };
export type GridSize = { width: number; height: number };

// 置いてあるマスより小さくはできない。縮めたら外に出たマスを消す形にしないのは、消したつもりのないマスが消えるため（studio#40）
export function minSize(tiles: Tile[], rangeMin: number): GridSize {
  const fit = sizeToFit(tiles);
  return {
    width: Math.max(rangeMin, fit.width),
    height: Math.max(rangeMin, fit.height),
  };
}

// 入力中の文字が、整数で下限以上・上限以下のときだけその値。それ以外は今の値のまま（範囲の外の値で描くと、桁違いの数のボタンで固まる）
export function inRange(
  text: string,
  current: number,
  lower: number,
  max: number,
): number {
  const value = Number(text);
  return text.trim() !== "" &&
    Number.isInteger(value) &&
    value >= lower &&
    value <= max
    ? value
    : current;
}

// 入力中の幅・高さに合わせて、格子を描く大きさを決める
export function gridSizeFor(
  input: SizeInput,
  current: GridSize,
  lower: GridSize,
  max: number,
): GridSize {
  return {
    width: inRange(input.width, current.width, lower.width, max),
    height: inRange(input.height, current.height, lower.height, max),
  };
}

// 下限より小さい値は、入力の min で保存も止まる途中の値として、core に問い合わせない
export function isBelowMin(input: SizeInput, lower: GridSize): boolean {
  return (
    Number(input.width) < lower.width || Number(input.height) < lower.height
  );
}
