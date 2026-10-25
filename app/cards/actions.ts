"use server";

import { refresh } from "next/cache";
import { graphql } from "@/graphql";
import { callCore } from "@/lib/core";
import { type Notice, target } from "../deck-form";
import {
  CORE_UNAVAILABLE,
  FORBIDDEN,
  INVALID_STATUS_TRANSITION,
  INVALID_TARGET,
  NOT_REFLECTED,
  REVISION_CONFLICT,
} from "../messages";
import { waitCard } from "./wait-card";

const publishCardMutation = graphql(`
  mutation PublishCard($input: PublishCardInput!) {
    publishCard(input: $input) {
      __typename
      ... on PublishCardSuccess {
        id
        revision
      }
    }
  }
`);

const retireCardMutation = graphql(`
  mutation RetireCard($input: RetireCardInput!) {
    retireCard(input: $input) {
      __typename
      ... on RetireCardSuccess {
        id
        revision
      }
    }
  }
`);

// 一覧は名前で絞って待つため、名前も画面が隠し項目で送る
function cardTarget(
  form: FormData,
): { id: string; revision: number; name: string } | undefined {
  const card = target(form);
  const name = form.get("name");
  if (card === undefined || typeof name !== "string") {
    return undefined;
  }
  return { ...card, name };
}

async function showChanged(
  card: { id: string; name: string },
  revision: number,
  status: string,
): Promise<Notice> {
  const reached = await waitCard(card.id, card.name, revision);
  refresh();
  return reached === "reached" ? { status } : { status: NOT_REFLECTED };
}

export async function publishCard(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const card = cardTarget(form);
  if (card === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(publishCardMutation, {
    input: { id: card.id, revision: card.revision },
  });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const published = result.data.publishCard;
  switch (published.__typename) {
    case "PublishCardSuccess":
      return showChanged(card, published.revision, "公開しました");
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "InvalidCardStatusTransitionError":
      refresh();
      return { error: INVALID_STATUS_TRANSITION };
    case "CardNotFoundError":
      refresh();
      return { error: "このカードは見つかりません" };
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}

export async function retireCard(
  _previous: Notice,
  form: FormData,
): Promise<Notice> {
  const card = cardTarget(form);
  if (card === undefined) {
    return { error: INVALID_TARGET };
  }

  const result = await callCore(retireCardMutation, {
    input: { id: card.id, revision: card.revision },
  });
  if (!result.ok) {
    return { error: CORE_UNAVAILABLE };
  }

  const retired = result.data.retireCard;
  switch (retired.__typename) {
    case "RetireCardSuccess":
      return showChanged(card, retired.revision, "使用不可にしました");
    case "RevisionConflictError":
      refresh();
      return { error: REVISION_CONFLICT };
    case "InvalidCardStatusTransitionError":
      refresh();
      return { error: INVALID_STATUS_TRANSITION };
    case "CardNotFoundError":
      refresh();
      return { error: "このカードは見つかりません" };
    case "ForbiddenError":
      return { error: FORBIDDEN };
  }
}
