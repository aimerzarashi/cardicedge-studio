// 画面（Server Action・ページ）と tests/ の両方が読むため、server-only や "use server" のファイルには置かない
// （"use server" のファイルは非同期の関数しか export できず、server-only はテストの Node から読めない）。
// 操作の名前は全体で一意にする（codegen の決まり）
import { graphql } from "@/graphql";

export const boardRevisionQuery = graphql(`
  query BoardRevision($id: UUID!) {
    board(id: $id) {
      __typename
      ... on Board {
        revision
      }
    }
  }
`);

export const changeBoardLayoutMutation = graphql(`
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
