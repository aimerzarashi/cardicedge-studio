// 画面（Server Action・ページ）と tests/ の両方が読むため、server-only や "use server" のファイルには置かない
// （"use server" のファイルは非同期の関数しか export できず、server-only はテストの Node から読めない）。
// 操作の名前は全体で一意にする（codegen の決まり）
import { graphql } from "@/graphql";

export const presetDeckRevisionQuery = graphql(`
  query PresetDeckRevision($id: UUID!) {
    presetDeck(id: $id) {
      __typename
      ... on PresetDeck {
        revision
      }
    }
  }
`);

export const registerPresetDeckMutation = graphql(`
  mutation RegisterPresetDeck($input: RegisterPresetDeckInput!) {
    registerPresetDeck(input: $input) {
      __typename
      ... on RegisterPresetDeckSuccess {
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

export const setPresetDeckCardCountsMutation = graphql(`
  mutation SetPresetDeckCardCounts($input: SetPresetDeckCardCountsInput!) {
    setPresetDeckCardCounts(input: $input) {
      __typename
      ... on SetPresetDeckCardCountsSuccess {
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
