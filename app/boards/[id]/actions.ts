"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { graphql } from "@/graphql";
import { callCore } from "@/lib/core";
import { type Notice, type RenameDeckState, target } from "../../deck-form";
import {
  BOARD_NOT_DRAFT,
  boardPublishErrorMessage,
  boardRuleErrorMessage,
  CORE_UNAVAILABLE,
  FORBIDDEN,
  INVALID_STATUS_TRANSITION,
  INVALID_TARGET,
  NAME_ALREADY_IN_USE,
  NOT_REFLECTED,
  nameErrorMessage,
  REVISION_CONFLICT,
} from "../../messages";
import { waitBoard } from "../wait-board";
import {
  type ChangeLayoutState,
  layoutErrors,
  parseLayout,
  tileInput,
} from "./layout-form";
import { type ChangeRulesState, parseRules } from "./rules-form";

const renameBoardMutation = graphql(`
  mutation RenameBoard($input: RenameBoardInput!) {
    renameBoard(input: $input) {
      __typename
      ... on RenameBoardSuccess {
        id
        revision
      }
      ... on ValidationErrors {
        errors {
          __typename
          ... on FieldTooLong {
            max
          }
        }
      }
    }
  }
`);

const changeBoardDefaultRulesMutation = graphql(`
  mutation ChangeBoardDefaultRules($input: ChangeBoardDefaultRulesInput!) {
    changeBoardDefaultRules(input: $input) {
      __typename
      ... on ChangeBoardDefaultRulesSuccess {
        id
        revision
      }
      ... on ValidationErrors {
        errors {
          __typename
          field
          ... on FieldTooSmall {
            min
          }
          ... on FieldNotGreaterThan {
            than
          }
        }
      }
    }
  }
`);

const changeBoardLayoutMutation = graphql(`
  mutation ChangeBoardLayout($input: ChangeBoardLayoutInput!) {
    changeBoardLayout(input: $input) {
      __typename
      ... on ChangeBoardLayoutSuccess {
        id
        revision
      }
      ... on ValidationErrors {
        errors {
          __typename
          field
          ... on FieldOutOfRange {
            min
            max
          }
        }
      }
    }
  }
`);

const deleteBoardMutation = graphql(`
  mutation DeleteBoard($input: DeleteBoardInput!) {
    deleteBoard(input: $input) {
      __typename
    }
  }
`);

const publishBoardMutation = graphql(`
  mutation PublishBoard($input: PublishBoardInput!) {
    publishBoard(input: $input) {
      __typename
      ... on PublishBoardSuccess {
        id
        revision
      }
      ... on BoardNotPublishableError {
        baseCount
        checkpointCount
        unreachableTiles {
          x
          y
        }
      }
    }
  }
`);

const retireBoardMutation = graphql(`
  mutation RetireBoard($input: RetireBoardInput!) {
    retireBoard(input: $input) {
      __typename
      ... on RetireBoardSuccess {
        id
        revision
      }
    }
  }
`);

// 操作の結果の revision が詳細に届いてから出し直す（届く前に出し直すと、古い revision のまま次の操作をしてしまう）
async function showChanged(
  id: string,
  revision: number,
  status: string,
): Promise<Notice> {
  const reached = await waitBoard(id, revision);
  refresh();
  return reached === "reached" ? { status } : { status: NOT_REFLECTED };
}

export async function renameBoard(
  _previous: RenameDeckState,
  form: FormData,
): Promise<RenameDeckState> {
  const board = target(form);
  const name = form.get("name");
  if (board === undefined || typeof name !== "string") {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(renameBoardMutation, {
    input: { ...board, name },
  });
  if (!result.ok) {
    return { revision: board.revision, value: name, error: CORE_UNAVAILABLE };
  }

  const renamed = result.data.renameBoard;
  switch (renamed.__typename) {
    case "RenameBoardSuccess":
      return showChanged(renamed.id, renamed.revision, "名前を変えました");
    case "ValidationErrors":
      return {
        revision: board.revision,
        value: name,
        nameError: nameErrorMessage(renamed.errors),
      };
    case "BoardNameAlreadyInUseError":
      return {
        revision: board.revision,
        value: name,
        nameError: NAME_ALREADY_IN_USE,
      };
    case "BoardNotDraftError":
      refresh();
      return { error: BOARD_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    // 画面を出し直すと「見つからない」になる
    case "BoardNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { revision: board.revision, value: name, error: FORBIDDEN };
  }
}

export async function changeBoardDefaultRules(
  _previous: ChangeRulesState,
  form: FormData,
): Promise<ChangeRulesState> {
  const parsed = parseRules(form);
  if (parsed === undefined) {
    return { error: INVALID_TARGET };
  }
  if (parsed.kind === "invalid") {
    return parsed.state;
  }
  const { board, rules } = parsed;

  const result = await callCore(changeBoardDefaultRulesMutation, {
    input: { ...board, ...rules },
  });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const changed = result.data.changeBoardDefaultRules;
  switch (changed.__typename) {
    case "ChangeBoardDefaultRulesSuccess":
      return showChanged(changed.id, changed.revision, "ルールを保存しました");
    case "ValidationErrors":
      return {
        revision: board.revision,
        values: Object.fromEntries(
          Object.entries(rules).map(([field, value]) => [field, String(value)]),
        ) as ChangeRulesState["values"],
        ruleErrors: changed.errors.map(boardRuleErrorMessage),
      };
    case "BoardNotDraftError":
      refresh();
      return { error: BOARD_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "BoardNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function changeBoardLayout(
  _previous: ChangeLayoutState,
  form: FormData,
): Promise<ChangeLayoutState> {
  const board = target(form);
  const layout = parseLayout(form);
  if (board === undefined || layout === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(changeBoardLayoutMutation, {
    input: { ...board, ...layout, tiles: layout.tiles.map(tileInput) },
  });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const changed = result.data.changeBoardLayout;
  switch (changed.__typename) {
    case "ChangeBoardLayoutSuccess":
      return showChanged(
        changed.id,
        changed.revision,
        "レイアウトを保存しました",
      );
    case "ValidationErrors":
      return {
        revision: board.revision,
        layoutErrors: layoutErrors(changed.errors, layout),
      };
    case "BoardNotDraftError":
      refresh();
      return { error: BOARD_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "BoardNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function deleteBoard(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const board = target(form);
  if (board === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(deleteBoardMutation, { input: board });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const deleted = result.data.deleteBoard;
  switch (deleted.__typename) {
    // 一覧は投影から読むため、移った直後は少し残ることがある。消えるまでは待たない（スターターデッキと同じ）
    case "DeleteBoardSuccess":
      return redirect("/boards");
    case "BoardNotDraftError":
      refresh();
      return { error: BOARD_NOT_DRAFT };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "BoardNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function publishBoard(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const board = target(form);
  if (board === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(publishBoardMutation, { input: board });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const published = result.data.publishBoard;
  switch (published.__typename) {
    case "PublishBoardSuccess":
      return showChanged(published.id, published.revision, "公開しました");
    case "BoardNotPublishableError":
      return { error: boardPublishErrorMessage(published) };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "BoardNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function retireBoard(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const board = target(form);
  if (board === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(retireBoardMutation, { input: board });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const retired = result.data.retireBoard;
  switch (retired.__typename) {
    case "RetireBoardSuccess":
      return showChanged(retired.id, retired.revision, "使用不可にしました");
    case "InvalidBoardStatusTransitionError":
      refresh();
      return { error: INVALID_STATUS_TRANSITION };
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "BoardNotFoundError":
      refresh();
      return {};
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}
