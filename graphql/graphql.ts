/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
/** カードの一覧の絞り込み */
export type CardFilter = {
  /** 名前に含まれる文字（前後の空白を除き、全角・半角、大文字・小文字の違いは無視する。空・空白だけは入力の誤り。50 文字まで） */
  nameContains?: string | null | undefined;
  /** 種類（指定が無ければすべて。空のリストは入力の誤り） */
  types?: Array<CardType> | null | undefined;
};

/** カードの種類（一覧の絞り込みに使う） */
export type CardType =
  | 'CREATURE'
  | 'ITEM'
  | 'SPELL';

/** プリセットデッキを削除する入力 */
export type DeletePresetDeckInput = {
  /** プリセットデッキの公開用の ID */
  id: string;
  /** 画面が見ていたプリセットデッキの revision */
  revision: number;
};

/** 変えるカードと、その枚数 */
export type PresetDeckCardCountInput = {
  /** カード（Creature・Item・Spell）の公開用の ID */
  cardId: string;
  /** その枚数にする（0〜4。0 にするとデッキから外す） */
  count: number;
};

/** プリセットデッキの一覧の絞り込み */
export type PresetDeckFilter = {
  /** 名前に含まれる文字（前後の空白を除き、全角・半角、大文字・小文字の違いは無視する。空・空白だけは入力の誤り。50 文字まで） */
  nameContains?: string | null | undefined;
};

/** クリーチャーを登録する入力 */
export type RegisterCreatureInput = {
  /** カード名（1〜50 文字。前後の空白は除いて保存する） */
  name: string;
};

/** アイテムを登録する入力 */
export type RegisterItemInput = {
  /** カード名（1〜50 文字。前後の空白は除いて保存する） */
  name: string;
};

/** プリセットデッキを登録する入力 */
export type RegisterPresetDeckInput = {
  /** 名前（1〜50 文字。前後の空白は除いて保存する） */
  name: string;
};

/** スペルを登録する入力 */
export type RegisterSpellInput = {
  /** カード名（1〜50 文字。前後の空白は除いて保存する） */
  name: string;
};

/** プリセットデッキの名前を変える入力 */
export type RenamePresetDeckInput = {
  /** プリセットデッキの公開用の ID */
  id: string;
  /** 新しい名前（1〜50 文字。前後の空白は除いて保存する） */
  name: string;
  /** 画面が見ていたプリセットデッキの revision */
  revision: number;
};

/** プリセットデッキのカードの枚数を変える入力 */
export type SetPresetDeckCardCountsInput = {
  /** 変えるカードだけの一覧（40 件まで。変えないカードは含めなくてよい。同じカードを 2 回入れると入力の誤り。空なら何も変えない。変えた後の枚数の合計が 40 を超えると入力の誤り） */
  cards: Array<PresetDeckCardCountInput>;
  /** プリセットデッキの公開用の ID */
  id: string;
  /** 画面が見ていたプリセットデッキの revision */
  revision: number;
};

export type CardsQueryVariables = Exact<{
  filter?: CardFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type CardsQuery = { cards:
    | { __typename: 'CardConnection', edges: Array<{ node:
          | { __typename: 'Creature', id: string, name: string, registeredAt: string, updatedAt: string }
          | { __typename: 'Item', id: string, name: string, registeredAt: string, updatedAt: string }
          | { __typename: 'Spell', id: string, name: string, registeredAt: string, updatedAt: string }
         }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'ValidationErrors' }
   };

export type RegisterCreatureMutationVariables = Exact<{
  input: RegisterCreatureInput;
}>;


export type RegisterCreatureMutation = { registerCreature:
    | { __typename: 'CardNameAlreadyInUseError' }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RegisterCreatureSuccess', creature: { name: string } }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
      > }
   };

export type RegisterItemMutationVariables = Exact<{
  input: RegisterItemInput;
}>;


export type RegisterItemMutation = { registerItem:
    | { __typename: 'CardNameAlreadyInUseError' }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RegisterItemSuccess', item: { name: string } }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
      > }
   };

export type RenamePresetDeckMutationVariables = Exact<{
  input: RenamePresetDeckInput;
}>;


export type RenamePresetDeckMutation = { renamePresetDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'PresetDeckNameAlreadyInUseError' }
    | { __typename: 'PresetDeckNotFoundError' }
    | { __typename: 'RenamePresetDeckSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
      > }
   };

export type SetPresetDeckCardCountsMutationVariables = Exact<{
  input: SetPresetDeckCardCountsInput;
}>;


export type SetPresetDeckCardCountsMutation = { setPresetDeckCardCounts:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'PresetDeckNotFoundError' }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'SetPresetDeckCardCountsSuccess', id: string, revision: number }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated', field: string }
        | { __typename: 'FieldInvalidFormat', field: string }
        | { __typename: 'FieldNotFound', field: string }
        | { __typename: 'FieldOutOfRange', min: number, max: number, field: string }
        | { __typename: 'FieldRequired', field: string }
        | { __typename: 'FieldTooLong', field: string }
        | { __typename: 'FieldTotalMismatch', field: string }
        | { __typename: 'FieldTotalTooLarge', max: number, field: string }
      > }
   };

export type DeletePresetDeckMutationVariables = Exact<{
  input: DeletePresetDeckInput;
}>;


export type DeletePresetDeckMutation = { deletePresetDeck:
    | { __typename: 'DeletePresetDeckSuccess' }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'PresetDeckNotFoundError' }
    | { __typename: 'RevisionConflictError' }
   };

export type PresetDeckQueryVariables = Exact<{
  id: string;
}>;


export type PresetDeckQuery = { presetDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'PresetDeck', id: string, name: string, totalCount: number, revision: number, registeredAt: string, updatedAt: string, cards: Array<{ count: number, card:
          | { __typename: 'Creature', id: string, name: string }
          | { __typename: 'Item', id: string, name: string }
          | { __typename: 'Spell', id: string, name: string }
         }> }
    | { __typename: 'PresetDeckNotFoundError' }
   };

export type DeckCandidateCardsQueryVariables = Exact<{
  filter?: CardFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type DeckCandidateCardsQuery = { cards:
    | { __typename: 'CardConnection', edges: Array<{ node:
          | { __typename: 'Creature', id: string, name: string }
          | { __typename: 'Item', id: string, name: string }
          | { __typename: 'Spell', id: string, name: string }
         }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'ValidationErrors' }
   };

export type RegisterPresetDeckMutationVariables = Exact<{
  input: RegisterPresetDeckInput;
}>;


export type RegisterPresetDeckMutation = { registerPresetDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'PresetDeckNameAlreadyInUseError' }
    | { __typename: 'RegisterPresetDeckSuccess', id: string, revision: number }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
      > }
   };

export type PresetDecksQueryVariables = Exact<{
  filter?: PresetDeckFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type PresetDecksQuery = { presetDecks:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'PresetDeckConnection', edges: Array<{ node: { id: string, name: string, totalCount: number, registeredAt: string, updatedAt: string } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ValidationErrors' }
   };

export type PresetDeckRevisionQueryVariables = Exact<{
  id: string;
}>;


export type PresetDeckRevisionQuery = { presetDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'PresetDeck', revision: number }
    | { __typename: 'PresetDeckNotFoundError' }
   };

export type RegisterSpellMutationVariables = Exact<{
  input: RegisterSpellInput;
}>;


export type RegisterSpellMutation = { registerSpell:
    | { __typename: 'CardNameAlreadyInUseError' }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RegisterSpellSuccess', spell: { name: string } }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
      > }
   };

export class TypedDocumentString<TResult, TVariables>
  extends String
  implements DocumentTypeDecoration<TResult, TVariables>
{
  __apiType?: NonNullable<DocumentTypeDecoration<TResult, TVariables>['__apiType']>;
  private value: string;
  public __meta__?: Record<string, any> | undefined;

  constructor(value: string, __meta__?: Record<string, any> | undefined) {
    super(value);
    this.value = value;
    this.__meta__ = __meta__;
  }

  override toString(): string & DocumentTypeDecoration<TResult, TVariables> {
    return this.value;
  }
}

export const CardsDocument = new TypedDocumentString(`
    query Cards($filter: CardFilter, $after: String) {
  cards(filter: $filter, after: $after) {
    __typename
    ... on CardConnection {
      edges {
        node {
          __typename
          id
          name
          registeredAt
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CardsQuery, CardsQueryVariables>;
export const RegisterCreatureDocument = new TypedDocumentString(`
    mutation RegisterCreature($input: RegisterCreatureInput!) {
  registerCreature(input: $input) {
    __typename
    ... on RegisterCreatureSuccess {
      creature {
        name
      }
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
    `) as unknown as TypedDocumentString<RegisterCreatureMutation, RegisterCreatureMutationVariables>;
export const RegisterItemDocument = new TypedDocumentString(`
    mutation RegisterItem($input: RegisterItemInput!) {
  registerItem(input: $input) {
    __typename
    ... on RegisterItemSuccess {
      item {
        name
      }
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
    `) as unknown as TypedDocumentString<RegisterItemMutation, RegisterItemMutationVariables>;
export const RenamePresetDeckDocument = new TypedDocumentString(`
    mutation RenamePresetDeck($input: RenamePresetDeckInput!) {
  renamePresetDeck(input: $input) {
    __typename
    ... on RenamePresetDeckSuccess {
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
    `) as unknown as TypedDocumentString<RenamePresetDeckMutation, RenamePresetDeckMutationVariables>;
export const SetPresetDeckCardCountsDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<SetPresetDeckCardCountsMutation, SetPresetDeckCardCountsMutationVariables>;
export const DeletePresetDeckDocument = new TypedDocumentString(`
    mutation DeletePresetDeck($input: DeletePresetDeckInput!) {
  deletePresetDeck(input: $input) {
    __typename
  }
}
    `) as unknown as TypedDocumentString<DeletePresetDeckMutation, DeletePresetDeckMutationVariables>;
export const PresetDeckDocument = new TypedDocumentString(`
    query PresetDeck($id: UUID!) {
  presetDeck(id: $id) {
    __typename
    ... on PresetDeck {
      id
      name
      cards {
        count
        card {
          __typename
          id
          name
        }
      }
      totalCount
      revision
      registeredAt
      updatedAt
    }
  }
}
    `) as unknown as TypedDocumentString<PresetDeckQuery, PresetDeckQueryVariables>;
export const DeckCandidateCardsDocument = new TypedDocumentString(`
    query DeckCandidateCards($filter: CardFilter, $after: String) {
  cards(filter: $filter, after: $after) {
    __typename
    ... on CardConnection {
      edges {
        node {
          __typename
          id
          name
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
    `) as unknown as TypedDocumentString<DeckCandidateCardsQuery, DeckCandidateCardsQueryVariables>;
export const RegisterPresetDeckDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<RegisterPresetDeckMutation, RegisterPresetDeckMutationVariables>;
export const PresetDecksDocument = new TypedDocumentString(`
    query PresetDecks($filter: PresetDeckFilter, $after: String) {
  presetDecks(filter: $filter, after: $after) {
    __typename
    ... on PresetDeckConnection {
      edges {
        node {
          id
          name
          totalCount
          registeredAt
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PresetDecksQuery, PresetDecksQueryVariables>;
export const PresetDeckRevisionDocument = new TypedDocumentString(`
    query PresetDeckRevision($id: UUID!) {
  presetDeck(id: $id) {
    __typename
    ... on PresetDeck {
      revision
    }
  }
}
    `) as unknown as TypedDocumentString<PresetDeckRevisionQuery, PresetDeckRevisionQueryVariables>;
export const RegisterSpellDocument = new TypedDocumentString(`
    mutation RegisterSpell($input: RegisterSpellInput!) {
  registerSpell(input: $input) {
    __typename
    ... on RegisterSpellSuccess {
      spell {
        name
      }
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
    `) as unknown as TypedDocumentString<RegisterSpellMutation, RegisterSpellMutationVariables>;