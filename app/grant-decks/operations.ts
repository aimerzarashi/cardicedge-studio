// 画面（Server Action・ページ）と tests/ の両方が読むため、server-only や "use server" のファイルには置かない
// （"use server" のファイルは非同期の関数しか export できず、server-only はテストの Node から読めない）。
// 操作の名前は全体で一意にする（codegen の決まり）
import { graphql } from "@/graphql";

export const grantDeckRevisionQuery = graphql(`
  query GrantDeckRevision($id: UUID!) {
    grantDeck(id: $id) {
      __typename
      ... on GrantDeck {
        revision
      }
    }
  }
`);

export const registerGrantDeckMutation = graphql(`
  mutation RegisterGrantDeck($input: RegisterGrantDeckInput!) {
    registerGrantDeck(input: $input) {
      __typename
      ... on RegisterGrantDeckSuccess {
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

export const setGrantDeckCardCountsMutation = graphql(`
  mutation SetGrantDeckCardCounts($input: SetGrantDeckCardCountsInput!) {
    setGrantDeckCardCounts(input: $input) {
      __typename
      ... on SetGrantDeckCardCountsSuccess {
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
