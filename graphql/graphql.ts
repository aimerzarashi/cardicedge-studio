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
  /** 状態（指定が無ければすべて。空のリストは入力の誤り） */
  statuses?: Array<CardStatus> | null | undefined;
  /** 種類（指定が無ければすべて。空のリストは入力の誤り） */
  types?: Array<CardType> | null | undefined;
};

/**
 * カードの状態。準備中は自由に変えられ、デッキに入れられず、game に写さない。公開中はデッキに入れられ、game に写す。
 * 使用不可は新しくデッキに入れられないが、プレイヤーが持っているので game には写す
 */
export type CardStatus =
  /** 準備中（登録したときの状態） */
  | 'DRAFT'
  /** 公開中 */
  | 'PUBLISHED'
  /** 使用不可 */
  | 'RETIRED';

/** カードの種類（一覧の絞り込みに使う） */
export type CardType =
  | 'CREATURE'
  | 'ITEM'
  | 'SPELL';

/** 変えるカードと、その枚数 */
export type DeckCardCountInput = {
  /** カード（Creature・Item・Spell）の公開用の ID */
  cardId: string;
  /** その枚数にする（0〜4。0 にするとデッキから外す） */
  count: number;
};

/** プリセットデッキを削除する入力 */
export type DeletePresetDeckInput = {
  /** プリセットデッキの公開用の ID */
  id: string;
  /** 画面が見ていたプリセットデッキの revision */
  revision: number;
};

/** スターターデッキを削除する入力 */
export type DeleteStarterDeckInput = {
  /** スターターデッキの公開用の ID */
  id: string;
  /** 画面が見ていたスターターデッキの revision */
  revision: number;
};

/** プリセットデッキの一覧の絞り込み */
export type PresetDeckFilter = {
  /** 名前に含まれる文字（前後の空白を除き、全角・半角、大文字・小文字の違いは無視する。空・空白だけは入力の誤り。50 文字まで） */
  nameContains?: string | null | undefined;
};

/** カードを公開中にする入力 */
export type PublishCardInput = {
  /** カード（Creature・Item・Spell）の公開用の ID */
  id: string;
  /** 画面が見ていたカードの revision */
  revision: number;
};

/** スターターデッキを公開する入力 */
export type PublishStarterDeckInput = {
  /** スターターデッキの公開用の ID */
  id: string;
  /** 画面が見ていたスターターデッキの revision */
  revision: number;
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

/** スターターデッキをプリセットデッキから写して登録する入力 */
export type RegisterStarterDeckFromPresetDeckInput = {
  /** 写す元のプリセットデッキの公開用の ID（名前・カードと枚数を写す。合計が 40 枚でなくてもよい） */
  presetDeckId: string;
};

/** スターターデッキを空から登録する入力 */
export type RegisterStarterDeckInput = {
  /** 名前（1〜50 文字。前後の空白は除いて保存する） */
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

/** スターターデッキの名前を変える入力 */
export type RenameStarterDeckInput = {
  /** スターターデッキの公開用の ID */
  id: string;
  /** 新しい名前（1〜50 文字。前後の空白は除いて保存する） */
  name: string;
  /** 画面が見ていたスターターデッキの revision */
  revision: number;
};

/** カードを使用不可にする入力 */
export type RetireCardInput = {
  /** カード（Creature・Item・Spell）の公開用の ID */
  id: string;
  /** 画面が見ていたカードの revision */
  revision: number;
};

/** スターターデッキを使用不可にする入力 */
export type RetireStarterDeckInput = {
  /** スターターデッキの公開用の ID */
  id: string;
  /** 画面が見ていたスターターデッキの revision */
  revision: number;
};

/** プリセットデッキのカードの枚数を変える入力 */
export type SetPresetDeckCardCountsInput = {
  /** 変えるカードだけの一覧（40 件まで。変えないカードは含めなくてよい。同じカードを 2 回入れると入力の誤り。空なら何も変えない。変えた後の枚数の合計が 40 を超えると入力の誤り） */
  cards: Array<DeckCardCountInput>;
  /** プリセットデッキの公開用の ID */
  id: string;
  /** 画面が見ていたプリセットデッキの revision */
  revision: number;
};

/** スターターデッキのカードの枚数を変える入力 */
export type SetStarterDeckCardCountsInput = {
  /** 変えるカードだけの一覧（40 件まで。変えないカードは含めなくてよい。同じカードを 2 回入れると入力の誤り。空なら何も変えない。変えた後の枚数の合計が 40 を超えると入力の誤り。新しく入れる・増やすカードは公開中だけ） */
  cards: Array<DeckCardCountInput>;
  /** スターターデッキの公開用の ID */
  id: string;
  /** 画面が見ていたスターターデッキの revision */
  revision: number;
};

/** スターターデッキの一覧の絞り込み */
export type StarterDeckFilter = {
  /** 名前に含まれる文字（前後の空白を除き、全角・半角、大文字・小文字の違いは無視する。空・空白だけは入力の誤り。50 文字まで） */
  nameContains?: string | null | undefined;
  /** 状態（指定が無ければすべて。空のリストは入力の誤り） */
  statuses?: Array<StarterDeckStatus> | null | undefined;
};

/**
 * スターターデッキの状態。準備中は名前・カードを自由に変えられ、決まり（40 枚等）を満たさなくてよい。公開中は決まりを満たし、
 * 新しいプレイヤーに配る。使用不可は配らない（配り済みのデッキはプレイヤーの持ち物なので変わらない）
 */
export type StarterDeckStatus =
  /** 準備中（登録したときの状態） */
  | 'DRAFT'
  /** 公開中 */
  | 'PUBLISHED'
  /** 使用不可 */
  | 'RETIRED';

export type PublishCardMutationVariables = Exact<{
  input: PublishCardInput;
}>;


export type PublishCardMutation = { publishCard:
    | { __typename: 'CardNotFoundError' }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'InvalidCardStatusTransitionError' }
    | { __typename: 'PublishCardSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
   };

export type RetireCardMutationVariables = Exact<{
  input: RetireCardInput;
}>;


export type RetireCardMutation = { retireCard:
    | { __typename: 'CardNotFoundError' }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'InvalidCardStatusTransitionError' }
    | { __typename: 'RetireCardSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
   };

export type CardsQueryVariables = Exact<{
  filter?: CardFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type CardsQuery = { cards:
    | { __typename: 'CardConnection', edges: Array<{ node:
          | { __typename: 'Creature', id: string, name: string, status: CardStatus, revision: number, registeredAt: string, updatedAt: string }
          | { __typename: 'Item', id: string, name: string, status: CardStatus, revision: number, registeredAt: string, updatedAt: string }
          | { __typename: 'Spell', id: string, name: string, status: CardStatus, revision: number, registeredAt: string, updatedAt: string }
         }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'ValidationErrors' }
   };

export type CardRevisionQueryVariables = Exact<{
  name: string;
}>;


export type CardRevisionQuery = { cards:
    | { __typename: 'CardConnection', edges: Array<{ node:
          | { id: string, revision: number }
          | { id: string, revision: number }
          | { id: string, revision: number }
         }> }
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
        | { __typename: 'FieldUnavailable' }
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
        | { __typename: 'FieldUnavailable' }
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
        | { __typename: 'FieldUnavailable' }
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
        | { __typename: 'FieldUnavailable', field: string }
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
        | { __typename: 'FieldUnavailable' }
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
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type RenameStarterDeckMutationVariables = Exact<{
  input: RenameStarterDeckInput;
}>;


export type RenameStarterDeckMutation = { renameStarterDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RenameStarterDeckSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'StarterDeckNameAlreadyInUseError' }
    | { __typename: 'StarterDeckNotDraftError' }
    | { __typename: 'StarterDeckNotFoundError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type SetStarterDeckCardCountsMutationVariables = Exact<{
  input: SetStarterDeckCardCountsInput;
}>;


export type SetStarterDeckCardCountsMutation = { setStarterDeckCardCounts:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'SetStarterDeckCardCountsSuccess', id: string, revision: number }
    | { __typename: 'StarterDeckNotDraftError' }
    | { __typename: 'StarterDeckNotFoundError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated', field: string }
        | { __typename: 'FieldInvalidFormat', field: string }
        | { __typename: 'FieldNotFound', field: string }
        | { __typename: 'FieldOutOfRange', min: number, max: number, field: string }
        | { __typename: 'FieldRequired', field: string }
        | { __typename: 'FieldTooLong', field: string }
        | { __typename: 'FieldTotalMismatch', field: string }
        | { __typename: 'FieldTotalTooLarge', max: number, field: string }
        | { __typename: 'FieldUnavailable', field: string }
      > }
   };

export type DeleteStarterDeckMutationVariables = Exact<{
  input: DeleteStarterDeckInput;
}>;


export type DeleteStarterDeckMutation = { deleteStarterDeck:
    | { __typename: 'DeleteStarterDeckSuccess' }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'StarterDeckNotDraftError' }
    | { __typename: 'StarterDeckNotFoundError' }
   };

export type PublishStarterDeckMutationVariables = Exact<{
  input: PublishStarterDeckInput;
}>;


export type PublishStarterDeckMutation = { publishStarterDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'PublishStarterDeckSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'StarterDeckLimitReachedError', max: number }
    | { __typename: 'StarterDeckNotFoundError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong' }
        | { __typename: 'FieldTotalMismatch', required: number }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type RetireStarterDeckMutationVariables = Exact<{
  input: RetireStarterDeckInput;
}>;


export type RetireStarterDeckMutation = { retireStarterDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'InvalidStarterDeckStatusTransitionError' }
    | { __typename: 'RetireStarterDeckSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'StarterDeckNotFoundError' }
   };

export type StarterDeckQueryVariables = Exact<{
  id: string;
}>;


export type StarterDeckQuery = { starterDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'StarterDeck', id: string, name: string, status: StarterDeckStatus, totalCount: number, revision: number, registeredAt: string, updatedAt: string, cards: Array<{ count: number, card:
          | { __typename: 'Creature', id: string, name: string }
          | { __typename: 'Item', id: string, name: string }
          | { __typename: 'Spell', id: string, name: string }
         }>, source: { presetDeckId: string, changedSinceCopied: boolean, presetDeckDeleted: boolean } | null }
    | { __typename: 'StarterDeckNotFoundError' }
   };

export type StarterDeckCandidateCardsQueryVariables = Exact<{
  filter?: CardFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type StarterDeckCandidateCardsQuery = { cards:
    | { __typename: 'CardConnection', edges: Array<{ node:
          | { __typename: 'Creature', id: string, name: string }
          | { __typename: 'Item', id: string, name: string }
          | { __typename: 'Spell', id: string, name: string }
         }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'ValidationErrors' }
   };

export type RegisterStarterDeckMutationVariables = Exact<{
  input: RegisterStarterDeckInput;
}>;


export type RegisterStarterDeckMutation = { registerStarterDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RegisterStarterDeckSuccess', id: string, revision: number }
    | { __typename: 'StarterDeckNameAlreadyInUseError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type RegisterStarterDeckFromPresetDeckMutationVariables = Exact<{
  input: RegisterStarterDeckFromPresetDeckInput;
}>;


export type RegisterStarterDeckFromPresetDeckMutation = { registerStarterDeckFromPresetDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'PresetDeckNotFoundError' }
    | { __typename: 'RegisterStarterDeckFromPresetDeckSuccess', id: string, revision: number }
    | { __typename: 'StarterDeckNameAlreadyInUseError' }
   };

export type CopySourcePresetDecksQueryVariables = Exact<{
  filter?: PresetDeckFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type CopySourcePresetDecksQuery = { presetDecks:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'PresetDeckConnection', edges: Array<{ node: { id: string, name: string, totalCount: number } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ValidationErrors' }
   };

export type StarterDecksQueryVariables = Exact<{
  filter?: StarterDeckFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type StarterDecksQuery = { starterDecks:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'StarterDeckConnection', edges: Array<{ node: { id: string, name: string, status: StarterDeckStatus, totalCount: number, registeredAt: string, updatedAt: string } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ValidationErrors' }
   };

export type StarterDeckRevisionQueryVariables = Exact<{
  id: string;
}>;


export type StarterDeckRevisionQuery = { starterDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'StarterDeck', revision: number }
    | { __typename: 'StarterDeckNotFoundError' }
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

export const PublishCardDocument = new TypedDocumentString(`
    mutation PublishCard($input: PublishCardInput!) {
  publishCard(input: $input) {
    __typename
    ... on PublishCardSuccess {
      id
      revision
    }
  }
}
    `) as unknown as TypedDocumentString<PublishCardMutation, PublishCardMutationVariables>;
export const RetireCardDocument = new TypedDocumentString(`
    mutation RetireCard($input: RetireCardInput!) {
  retireCard(input: $input) {
    __typename
    ... on RetireCardSuccess {
      id
      revision
    }
  }
}
    `) as unknown as TypedDocumentString<RetireCardMutation, RetireCardMutationVariables>;
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
          status
          revision
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
export const CardRevisionDocument = new TypedDocumentString(`
    query CardRevision($name: String!) {
  cards(filter: { nameContains: $name }, first: 100) {
    __typename
    ... on CardConnection {
      edges {
        node {
          id
          revision
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CardRevisionQuery, CardRevisionQueryVariables>;
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
export const RenameStarterDeckDocument = new TypedDocumentString(`
    mutation RenameStarterDeck($input: RenameStarterDeckInput!) {
  renameStarterDeck(input: $input) {
    __typename
    ... on RenameStarterDeckSuccess {
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
    `) as unknown as TypedDocumentString<RenameStarterDeckMutation, RenameStarterDeckMutationVariables>;
export const SetStarterDeckCardCountsDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<SetStarterDeckCardCountsMutation, SetStarterDeckCardCountsMutationVariables>;
export const DeleteStarterDeckDocument = new TypedDocumentString(`
    mutation DeleteStarterDeck($input: DeleteStarterDeckInput!) {
  deleteStarterDeck(input: $input) {
    __typename
  }
}
    `) as unknown as TypedDocumentString<DeleteStarterDeckMutation, DeleteStarterDeckMutationVariables>;
export const PublishStarterDeckDocument = new TypedDocumentString(`
    mutation PublishStarterDeck($input: PublishStarterDeckInput!) {
  publishStarterDeck(input: $input) {
    __typename
    ... on PublishStarterDeckSuccess {
      id
      revision
    }
    ... on StarterDeckLimitReachedError {
      max
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
    `) as unknown as TypedDocumentString<PublishStarterDeckMutation, PublishStarterDeckMutationVariables>;
export const RetireStarterDeckDocument = new TypedDocumentString(`
    mutation RetireStarterDeck($input: RetireStarterDeckInput!) {
  retireStarterDeck(input: $input) {
    __typename
    ... on RetireStarterDeckSuccess {
      id
      revision
    }
  }
}
    `) as unknown as TypedDocumentString<RetireStarterDeckMutation, RetireStarterDeckMutationVariables>;
export const StarterDeckDocument = new TypedDocumentString(`
    query StarterDeck($id: UUID!) {
  starterDeck(id: $id) {
    __typename
    ... on StarterDeck {
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
      status
      source {
        presetDeckId
        changedSinceCopied
        presetDeckDeleted
      }
      totalCount
      revision
      registeredAt
      updatedAt
    }
  }
}
    `) as unknown as TypedDocumentString<StarterDeckQuery, StarterDeckQueryVariables>;
export const StarterDeckCandidateCardsDocument = new TypedDocumentString(`
    query StarterDeckCandidateCards($filter: CardFilter, $after: String) {
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
    `) as unknown as TypedDocumentString<StarterDeckCandidateCardsQuery, StarterDeckCandidateCardsQueryVariables>;
export const RegisterStarterDeckDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<RegisterStarterDeckMutation, RegisterStarterDeckMutationVariables>;
export const RegisterStarterDeckFromPresetDeckDocument = new TypedDocumentString(`
    mutation RegisterStarterDeckFromPresetDeck($input: RegisterStarterDeckFromPresetDeckInput!) {
  registerStarterDeckFromPresetDeck(input: $input) {
    __typename
    ... on RegisterStarterDeckFromPresetDeckSuccess {
      id
      revision
    }
  }
}
    `) as unknown as TypedDocumentString<RegisterStarterDeckFromPresetDeckMutation, RegisterStarterDeckFromPresetDeckMutationVariables>;
export const CopySourcePresetDecksDocument = new TypedDocumentString(`
    query CopySourcePresetDecks($filter: PresetDeckFilter, $after: String) {
  presetDecks(filter: $filter, after: $after) {
    __typename
    ... on PresetDeckConnection {
      edges {
        node {
          id
          name
          totalCount
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
    `) as unknown as TypedDocumentString<CopySourcePresetDecksQuery, CopySourcePresetDecksQueryVariables>;
export const StarterDecksDocument = new TypedDocumentString(`
    query StarterDecks($filter: StarterDeckFilter, $after: String) {
  starterDecks(filter: $filter, after: $after) {
    __typename
    ... on StarterDeckConnection {
      edges {
        node {
          id
          name
          status
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
    `) as unknown as TypedDocumentString<StarterDecksQuery, StarterDecksQueryVariables>;
export const StarterDeckRevisionDocument = new TypedDocumentString(`
    query StarterDeckRevision($id: UUID!) {
  starterDeck(id: $id) {
    __typename
    ... on StarterDeck {
      revision
    }
  }
}
    `) as unknown as TypedDocumentString<StarterDeckRevisionQuery, StarterDeckRevisionQueryVariables>;