import { boardPublishProblemMessage } from "../messages.ts";
import type { Mark, Position } from "./board-layout.ts";

// ボードを公開できない理由（core の Board.publishProblems と BoardNotPublishableError.problems の形）。
// 判定は core で、ここでは見せ方だけを持つ。座標は core と同じ 0 始まり。
// 一覧の部品（publish-problems.tsx）と分けたのは、JSX を含む .tsx は node --test で読めず、単体テストにできないため
export type PublishProblem =
  | { __typename: "BaseCountProblem"; positions: Position[] }
  | { __typename: "NoCheckpointProblem" }
  | { __typename: "UnreachableTilesProblem"; positions: Position[] }
  | { __typename: "UnpairedTilesProblem"; positions: Position[] };

export function positionsOf(problem: PublishProblem): Position[] {
  return "positions" in problem ? problem.positions : [];
}

// 盤面に付ける印（座標のある理由だけ）。印の見せ方は格子の部品が決める
export function problemMarks(problems: PublishProblem[]): Mark[] {
  const marks: Mark[] = [];
  for (const problem of problems) {
    const label = boardPublishProblemMessage(problem);
    if (problem.__typename === "BaseCountProblem") {
      marks.push(
        ...problem.positions.map((p) => ({
          ...p,
          kind: "base" as const,
          label,
        })),
      );
    } else if (problem.__typename === "UnreachableTilesProblem") {
      marks.push(
        ...problem.positions.map((p) => ({
          ...p,
          kind: "unreachable" as const,
          label,
        })),
      );
    } else if (problem.__typename === "UnpairedTilesProblem") {
      marks.push(
        ...problem.positions.map((p) => ({
          ...p,
          kind: "unpaired" as const,
          label,
        })),
      );
    }
  }
  return marks;
}
