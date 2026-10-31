import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boardPublishProblemMessage,
  NAME_ALREADY_IN_USE,
  nameErrorMessage,
} from "./messages.ts";

describe("nameErrorMessage", () => {
  it("名前が空白だけのときは、名前の入力を促す", () => {
    assert.equal(
      nameErrorMessage([{ __typename: "FieldRequired" }]),
      "名前を入力してください",
    );
  });

  it("長すぎるときは、core が返した上限を文言に入れる", () => {
    assert.equal(
      nameErrorMessage([{ __typename: "FieldTooLong", max: 50 }]),
      "名前は 50 文字以内で入力してください",
    );
  });

  it("誤りが複数あるときは「。」でつなぐ", () => {
    assert.equal(
      nameErrorMessage([
        { __typename: "FieldRequired" },
        { __typename: "FieldTooLong", max: 50 },
      ]),
      "名前を入力してください。名前は 50 文字以内で入力してください",
    );
  });
});

describe("NAME_ALREADY_IN_USE", () => {
  it("全角・半角や大文字・小文字の違いも同じ名前とみなすことを伝える", () => {
    assert.match(NAME_ALREADY_IN_USE, /^この名前はすでに使われています/);
    assert.match(NAME_ALREADY_IN_USE, /全角・半角や大文字・小文字の違い/);
  });
});

describe("boardPublishProblemMessage（公開できない理由の文言）", () => {
  const at = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ x: i, y: 0 }));

  it("拠点が 0 のときは、ちょうど 1 つ置くよう伝える", () => {
    assert.equal(
      boardPublishProblemMessage({
        __typename: "BaseCountProblem",
        positions: [],
      }),
      "拠点がありません。ちょうど 1 つ置いてください",
    );
  });

  it("拠点が複数のときは、数を言ってちょうど 1 つにするよう伝える", () => {
    assert.equal(
      boardPublishProblemMessage({
        __typename: "BaseCountProblem",
        positions: at(2),
      }),
      "拠点が 2 つあります。ちょうど 1 つにしてください",
    );
  });

  it("チェックポイントが無いときは、1 つ以上置くよう伝える", () => {
    assert.equal(
      boardPublishProblemMessage({ __typename: "NoCheckpointProblem" }),
      "チェックポイントがありません。1 つ以上置いてください",
    );
  });

  it("行けないマスは、座標の羅列でなく数で言う", () => {
    const message = boardPublishProblemMessage({
      __typename: "UnreachableTilesProblem",
      positions: at(2),
    });

    assert.equal(message, "拠点から行けないマスが 2 つあります");
    assert.doesNotMatch(message, /\(\d+, \d+\)/);
  });

  it("相手のいない転送円・橋は、数を言って対にするか消すよう伝える", () => {
    assert.equal(
      boardPublishProblemMessage({
        __typename: "UnpairedTilesProblem",
        positions: at(1),
      }),
      "相手のいない転送円・橋が 1 つあります。対にするか、消してください",
    );
  });
});
