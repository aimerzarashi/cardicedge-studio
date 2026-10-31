import { boardPublishProblemMessage } from "../messages";
import type { Position } from "./board-layout";
import { type PublishProblem, positionsOf } from "./publish-problem";

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
