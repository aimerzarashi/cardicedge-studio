import { boardPublishProblemMessage } from "../messages";
import type { Mark, Position } from "./board-layout";

// ボードを公開できない理由（core の Board.publishProblems と BoardNotPublishableError.problems の形）。
// 判定は core で、ここでは見せ方だけを持つ。座標は core と同じ 0 始まり
export type PublishProblem =
  | { __typename: "BaseCountProblem"; positions: Position[] }
  | { __typename: "NoCheckpointProblem" }
  | { __typename: "UnreachableTilesProblem"; positions: Position[] };

function positionsOf(problem: PublishProblem): Position[] {
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
    }
  }
  return marks;
}

// 公開できない理由の一覧。onSelect を渡すと、座標のある理由は押せる項目（盤面のマスへ動かすため）になる。
// 公開に失敗したときの一覧は盤面と別の部品に出すため onSelect を渡さず、文言だけを出す
export function PublishProblemList({
  problems,
  onSelect,
}: {
  problems: PublishProblem[];
  onSelect?: (positions: Position[]) => void;
}) {
  if (problems.length === 0) {
    return <p>公開できます</p>;
  }
  return (
    <ul aria-label="公開できない理由">
      {problems.map((problem) => {
        const positions = positionsOf(problem);
        const message = boardPublishProblemMessage(problem);
        return (
          <li key={problem.__typename}>
            {onSelect && positions.length > 0 ? (
              <button type="button" onClick={() => onSelect(positions)}>
                {message}
              </button>
            ) : (
              message
            )}
          </li>
        );
      })}
    </ul>
  );
}
