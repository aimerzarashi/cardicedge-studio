// 画面（Server Action・ページ）と tests/ の両方が読むため、server-only や "use server" のファイルには置かない
// （"use server" のファイルは非同期の関数しか export できず、server-only はテストの Node から読めない）。
// 操作の名前は全体で一意にする（codegen の決まり）
import { graphql } from "@/graphql";

export const npcDeckRevisionQuery = graphql(`
  query NpcDeckRevision($id: UUID!) {
    npcDeck(id: $id) {
      __typename
      ... on NpcDeck {
        revision
      }
    }
  }
`);

export const registerNpcDeckMutation = graphql(`
  mutation RegisterNpcDeck($input: RegisterNpcDeckInput!) {
    registerNpcDeck(input: $input) {
      __typename
      ... on RegisterNpcDeckSuccess {
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

export const setNpcDeckCardCountsMutation = graphql(`
  mutation SetNpcDeckCardCounts($input: SetNpcDeckCardCountsInput!) {
    setNpcDeckCardCounts(input: $input) {
      __typename
      ... on SetNpcDeckCardCountsSuccess {
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
          ... on FieldTotalTooLarge {
            max
          }
        }
      }
    }
  }
`);

export const publishNpcDeckMutation = graphql(`
  mutation PublishNpcDeck($input: PublishNpcDeckInput!) {
    publishNpcDeck(input: $input) {
      __typename
      ... on PublishNpcDeckSuccess {
        id
        revision
      }
      ... on ValidationErrors {
        errors {
          __typename
          ... on FieldTotalMismatch {
            required
          }
        }
      }
    }
  }
`);
