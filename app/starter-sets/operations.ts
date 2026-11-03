// 画面（Server Action・ページ）と tests/ の両方が読むため、server-only や "use server" のファイルには置かない
// （"use server" のファイルは非同期の関数しか export できず、server-only はテストの Node から読めない）。
// 操作の名前は全体で一意にする（codegen の決まり）
import { graphql } from "@/graphql";

export const starterSetRevisionQuery = graphql(`
  query StarterSetRevision($id: UUID!) {
    starterSet(id: $id) {
      __typename
      ... on StarterSet {
        revision
      }
    }
  }
`);

export const registerStarterSetMutation = graphql(`
  mutation RegisterStarterSet($input: RegisterStarterSetInput!) {
    registerStarterSet(input: $input) {
      __typename
      ... on RegisterStarterSetSuccess {
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

export const setStarterSetGrantDecksMutation = graphql(`
  mutation SetStarterSetGrantDecks($input: SetStarterSetGrantDecksInput!) {
    setStarterSetGrantDecks(input: $input) {
      __typename
      ... on SetStarterSetGrantDecksSuccess {
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

export const setStarterSetUnlockBoardsMutation = graphql(`
  mutation SetStarterSetUnlockBoards($input: SetStarterSetUnlockBoardsInput!) {
    setStarterSetUnlockBoards(input: $input) {
      __typename
      ... on SetStarterSetUnlockBoardsSuccess {
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

export const setStarterSetUnlockNpcAvatarsMutation = graphql(`
  mutation SetStarterSetUnlockNpcAvatars(
    $input: SetStarterSetUnlockNpcAvatarsInput!
  ) {
    setStarterSetUnlockNpcAvatars(input: $input) {
      __typename
      ... on SetStarterSetUnlockNpcAvatarsSuccess {
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
