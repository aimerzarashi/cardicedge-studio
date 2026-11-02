// 画面（Server Action・ページ）と tests/ の両方が読むため、server-only や "use server" のファイルには置かない
// （"use server" のファイルは非同期の関数しか export できず、server-only はテストの Node から読めない）。
// 操作の名前は全体で一意にする（codegen の決まり）
import { graphql } from "@/graphql";

export const starterDeckRevisionQuery = graphql(`
  query StarterDeckRevision($id: UUID!) {
    starterDeck(id: $id) {
      __typename
      ... on StarterDeck {
        revision
      }
    }
  }
`);

export const registerStarterDeckMutation = graphql(`
  mutation RegisterStarterDeck($input: RegisterStarterDeckInput!) {
    registerStarterDeck(input: $input) {
      __typename
      ... on RegisterStarterDeckSuccess {
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

export const setStarterDeckCardCountsMutation = graphql(`
  mutation SetStarterDeckCardCounts($input: SetStarterDeckCardCountsInput!) {
    setStarterDeckCardCounts(input: $input) {
      __typename
      ... on SetStarterDeckCardCountsSuccess {
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
