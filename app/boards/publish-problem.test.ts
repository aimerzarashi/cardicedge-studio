import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { boardPublishProblemMessage } from "../messages.ts";
import {
  type PublishProblem,
  positionsOf,
  problemMarks,
} from "./publish-problem.ts";

const base: PublishProblem = {
  __typename: "BaseCountProblem",
  positions: [
    { x: 0, y: 0 },
    { x: 7, y: 7 },
  ],
};
const unreachable: PublishProblem = {
  __typename: "UnreachableTilesProblem",
  positions: [
    { x: 2, y: 3 },
    { x: 4, y: 5 },
  ],
};
const unpaired: PublishProblem = {
  __typename: "UnpairedTilesProblem",
  positions: [{ x: 5, y: 5 }],
};
const noCheckpoint: PublishProblem = { __typename: "NoCheckpointProblem" };

describe("problemMarks", () => {
  it("拠点の数の理由は、拠点すべてに base の印を付ける", () => {
    assert.deepEqual(
      problemMarks([base]).map(({ x, y, kind }) => ({ x, y, kind })),
      [
        { x: 0, y: 0, kind: "base" },
        { x: 7, y: 7, kind: "base" },
      ],
    );
  });

  it("行けないマスの理由は、そのマスすべてに unreachable の印を付ける", () => {
    assert.deepEqual(
      problemMarks([unreachable]).map(({ x, y, kind }) => ({ x, y, kind })),
      [
        { x: 2, y: 3, kind: "unreachable" },
        { x: 4, y: 5, kind: "unreachable" },
      ],
    );
  });

  it("相手のいない転送円・橋の理由は、unpaired の印を付ける", () => {
    assert.deepEqual(
      problemMarks([unpaired]).map(({ x, y, kind }) => ({ x, y, kind })),
      [{ x: 5, y: 5, kind: "unpaired" }],
    );
  });

  it("印の説明（label）は、その理由の文言になる", () => {
    assert.deepEqual(
      problemMarks([unreachable]).map((mark) => mark.label),
      Array(2).fill(boardPublishProblemMessage(unreachable)),
    );
  });

  it("座標の無い理由（チェックポイントが無い）や、拠点が 0 の理由には印が付かない", () => {
    assert.deepEqual(
      problemMarks([
        noCheckpoint,
        { __typename: "BaseCountProblem", positions: [] },
      ]),
      [],
    );
  });

  it("理由が重なるマスには、理由ごとの印が並ぶ", () => {
    const marks = problemMarks([
      { __typename: "UnreachableTilesProblem", positions: [{ x: 5, y: 5 }] },
      unpaired,
    ]);

    assert.deepEqual(
      marks
        .filter((mark) => mark.x === 5 && mark.y === 5)
        .map((mark) => mark.kind),
      ["unreachable", "unpaired"],
    );
  });

  it("理由が無ければ印も無い", () => {
    assert.deepEqual(problemMarks([]), []);
  });
});

describe("positionsOf", () => {
  it("座標のある理由は座標を返し、無い理由は空を返す", () => {
    assert.deepEqual(positionsOf(unpaired), [{ x: 5, y: 5 }]);
    assert.deepEqual(positionsOf(noCheckpoint), []);
  });
});
