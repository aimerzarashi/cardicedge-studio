// 画面（Server Action・ページ）と tests/ の両方が読むため、server-only や "use server" のファイルには置かない
// （"use server" のファイルは非同期の関数しか export できず、server-only はテストの Node から読めない）。
// 操作の名前は全体で一意にする（codegen の決まり）
import { graphql } from "@/graphql";

export const npcAvatarRevisionQuery = graphql(`
  query NpcAvatarRevision($id: UUID!) {
    npcAvatar(id: $id) {
      __typename
      ... on NpcAvatar {
        revision
      }
    }
  }
`);

export const registerNpcAvatarMutation = graphql(`
  mutation RegisterNpcAvatar($input: RegisterNpcAvatarInput!) {
    registerNpcAvatar(input: $input) {
      __typename
      ... on RegisterNpcAvatarSuccess {
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

export const setNpcAvatarDecksMutation = graphql(`
  mutation SetNpcAvatarDecks($input: SetNpcAvatarDecksInput!) {
    setNpcAvatarDecks(input: $input) {
      __typename
      ... on SetNpcAvatarDecksSuccess {
        id
        revision
      }
      ... on ValidationErrors {
        errors {
          __typename
        }
      }
    }
  }
`);
