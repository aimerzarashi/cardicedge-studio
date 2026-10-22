/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query Cards($filter: CardFilter, $after: String) {\n    cards(filter: $filter, after: $after) {\n      __typename\n      ... on CardConnection {\n        edges {\n          node {\n            __typename\n            id\n            name\n            registeredAt\n            updatedAt\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": typeof types.CardsDocument,
    "\n  mutation RegisterCreature($input: RegisterCreatureInput!) {\n    registerCreature(input: $input) {\n      __typename\n      ... on RegisterCreatureSuccess {\n        creature {\n          name\n        }\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n": typeof types.RegisterCreatureDocument,
    "\n  mutation RegisterItem($input: RegisterItemInput!) {\n    registerItem(input: $input) {\n      __typename\n      ... on RegisterItemSuccess {\n        item {\n          name\n        }\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n": typeof types.RegisterItemDocument,
    "\n  mutation RenamePresetDeck($input: RenamePresetDeckInput!) {\n    renamePresetDeck(input: $input) {\n      __typename\n      ... on RenamePresetDeckSuccess {\n        id\n        revision\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n": typeof types.RenamePresetDeckDocument,
    "\n  mutation SetPresetDeckCardCounts($input: SetPresetDeckCardCountsInput!) {\n    setPresetDeckCardCounts(input: $input) {\n      __typename\n      ... on SetPresetDeckCardCountsSuccess {\n        id\n        revision\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          field\n          ... on FieldOutOfRange {\n            min\n            max\n          }\n          ... on FieldTotalTooLarge {\n            max\n          }\n        }\n      }\n    }\n  }\n": typeof types.SetPresetDeckCardCountsDocument,
    "\n  mutation DeletePresetDeck($input: DeletePresetDeckInput!) {\n    deletePresetDeck(input: $input) {\n      __typename\n    }\n  }\n": typeof types.DeletePresetDeckDocument,
    "\n  query PresetDeck($id: UUID!) {\n    presetDeck(id: $id) {\n      __typename\n      ... on PresetDeck {\n        id\n        name\n        cards {\n          count\n          card {\n            __typename\n            id\n            name\n          }\n        }\n        totalCount\n        revision\n        registeredAt\n        updatedAt\n      }\n    }\n  }\n": typeof types.PresetDeckDocument,
    "\n  query DeckCandidateCards($filter: CardFilter, $after: String) {\n    cards(filter: $filter, after: $after) {\n      __typename\n      ... on CardConnection {\n        edges {\n          node {\n            __typename\n            id\n            name\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": typeof types.DeckCandidateCardsDocument,
    "\n  mutation RegisterPresetDeck($input: RegisterPresetDeckInput!) {\n    registerPresetDeck(input: $input) {\n      __typename\n      ... on RegisterPresetDeckSuccess {\n        id\n        revision\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n": typeof types.RegisterPresetDeckDocument,
    "\n  query PresetDecks($filter: PresetDeckFilter, $after: String) {\n    presetDecks(filter: $filter, after: $after) {\n      __typename\n      ... on PresetDeckConnection {\n        edges {\n          node {\n            id\n            name\n            totalCount\n            registeredAt\n            updatedAt\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": typeof types.PresetDecksDocument,
    "\n  query PresetDeckRevision($id: UUID!) {\n    presetDeck(id: $id) {\n      __typename\n      ... on PresetDeck {\n        revision\n      }\n    }\n  }\n": typeof types.PresetDeckRevisionDocument,
    "\n  mutation RegisterSpell($input: RegisterSpellInput!) {\n    registerSpell(input: $input) {\n      __typename\n      ... on RegisterSpellSuccess {\n        spell {\n          name\n        }\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n": typeof types.RegisterSpellDocument,
    "\n  mutation SetStarterDeckSet($input: SetStarterDeckSetInput!) {\n    setStarterDeckSet(input: $input) {\n      __typename\n      ... on SetStarterDeckSetSuccess {\n        revision\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          field\n          ... on FieldOutOfRange {\n            min\n            max\n          }\n          ... on FieldTotalMismatch {\n            required\n          }\n        }\n      }\n    }\n  }\n": typeof types.SetStarterDeckSetDocument,
    "\n  query StarterDeckSetForEdit {\n    starterDeckSet {\n      __typename\n      ... on StarterDeckSet {\n        revision\n      }\n    }\n  }\n": typeof types.StarterDeckSetForEditDocument,
    "\n  query SelectedPresetDeck($id: UUID!) {\n    presetDeck(id: $id) {\n      __typename\n      ... on PresetDeck {\n        name\n        totalCount\n      }\n    }\n  }\n": typeof types.SelectedPresetDeckDocument,
    "\n  query StarterDeckSetCandidates($filter: PresetDeckFilter, $after: String) {\n    presetDecks(filter: $filter, after: $after) {\n      __typename\n      ... on PresetDeckConnection {\n        edges {\n          node {\n            id\n            name\n            totalCount\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": typeof types.StarterDeckSetCandidatesDocument,
    "\n  query StarterDeckSet {\n    starterDeckSet {\n      __typename\n      ... on StarterDeckSet {\n        updatedAt\n        decks {\n          name\n          cards {\n            count\n            card {\n              __typename\n              id\n              name\n            }\n          }\n          source {\n            presetDeckId\n            changedSinceCopied\n            presetDeckDeleted\n          }\n        }\n      }\n    }\n  }\n": typeof types.StarterDeckSetDocument,
    "\n  query StarterDeckSetRevision {\n    starterDeckSet {\n      __typename\n      ... on StarterDeckSet {\n        revision\n      }\n    }\n  }\n": typeof types.StarterDeckSetRevisionDocument,
};
const documents: Documents = {
    "\n  query Cards($filter: CardFilter, $after: String) {\n    cards(filter: $filter, after: $after) {\n      __typename\n      ... on CardConnection {\n        edges {\n          node {\n            __typename\n            id\n            name\n            registeredAt\n            updatedAt\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": types.CardsDocument,
    "\n  mutation RegisterCreature($input: RegisterCreatureInput!) {\n    registerCreature(input: $input) {\n      __typename\n      ... on RegisterCreatureSuccess {\n        creature {\n          name\n        }\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n": types.RegisterCreatureDocument,
    "\n  mutation RegisterItem($input: RegisterItemInput!) {\n    registerItem(input: $input) {\n      __typename\n      ... on RegisterItemSuccess {\n        item {\n          name\n        }\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n": types.RegisterItemDocument,
    "\n  mutation RenamePresetDeck($input: RenamePresetDeckInput!) {\n    renamePresetDeck(input: $input) {\n      __typename\n      ... on RenamePresetDeckSuccess {\n        id\n        revision\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n": types.RenamePresetDeckDocument,
    "\n  mutation SetPresetDeckCardCounts($input: SetPresetDeckCardCountsInput!) {\n    setPresetDeckCardCounts(input: $input) {\n      __typename\n      ... on SetPresetDeckCardCountsSuccess {\n        id\n        revision\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          field\n          ... on FieldOutOfRange {\n            min\n            max\n          }\n          ... on FieldTotalTooLarge {\n            max\n          }\n        }\n      }\n    }\n  }\n": types.SetPresetDeckCardCountsDocument,
    "\n  mutation DeletePresetDeck($input: DeletePresetDeckInput!) {\n    deletePresetDeck(input: $input) {\n      __typename\n    }\n  }\n": types.DeletePresetDeckDocument,
    "\n  query PresetDeck($id: UUID!) {\n    presetDeck(id: $id) {\n      __typename\n      ... on PresetDeck {\n        id\n        name\n        cards {\n          count\n          card {\n            __typename\n            id\n            name\n          }\n        }\n        totalCount\n        revision\n        registeredAt\n        updatedAt\n      }\n    }\n  }\n": types.PresetDeckDocument,
    "\n  query DeckCandidateCards($filter: CardFilter, $after: String) {\n    cards(filter: $filter, after: $after) {\n      __typename\n      ... on CardConnection {\n        edges {\n          node {\n            __typename\n            id\n            name\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": types.DeckCandidateCardsDocument,
    "\n  mutation RegisterPresetDeck($input: RegisterPresetDeckInput!) {\n    registerPresetDeck(input: $input) {\n      __typename\n      ... on RegisterPresetDeckSuccess {\n        id\n        revision\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n": types.RegisterPresetDeckDocument,
    "\n  query PresetDecks($filter: PresetDeckFilter, $after: String) {\n    presetDecks(filter: $filter, after: $after) {\n      __typename\n      ... on PresetDeckConnection {\n        edges {\n          node {\n            id\n            name\n            totalCount\n            registeredAt\n            updatedAt\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": types.PresetDecksDocument,
    "\n  query PresetDeckRevision($id: UUID!) {\n    presetDeck(id: $id) {\n      __typename\n      ... on PresetDeck {\n        revision\n      }\n    }\n  }\n": types.PresetDeckRevisionDocument,
    "\n  mutation RegisterSpell($input: RegisterSpellInput!) {\n    registerSpell(input: $input) {\n      __typename\n      ... on RegisterSpellSuccess {\n        spell {\n          name\n        }\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n": types.RegisterSpellDocument,
    "\n  mutation SetStarterDeckSet($input: SetStarterDeckSetInput!) {\n    setStarterDeckSet(input: $input) {\n      __typename\n      ... on SetStarterDeckSetSuccess {\n        revision\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          field\n          ... on FieldOutOfRange {\n            min\n            max\n          }\n          ... on FieldTotalMismatch {\n            required\n          }\n        }\n      }\n    }\n  }\n": types.SetStarterDeckSetDocument,
    "\n  query StarterDeckSetForEdit {\n    starterDeckSet {\n      __typename\n      ... on StarterDeckSet {\n        revision\n      }\n    }\n  }\n": types.StarterDeckSetForEditDocument,
    "\n  query SelectedPresetDeck($id: UUID!) {\n    presetDeck(id: $id) {\n      __typename\n      ... on PresetDeck {\n        name\n        totalCount\n      }\n    }\n  }\n": types.SelectedPresetDeckDocument,
    "\n  query StarterDeckSetCandidates($filter: PresetDeckFilter, $after: String) {\n    presetDecks(filter: $filter, after: $after) {\n      __typename\n      ... on PresetDeckConnection {\n        edges {\n          node {\n            id\n            name\n            totalCount\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n": types.StarterDeckSetCandidatesDocument,
    "\n  query StarterDeckSet {\n    starterDeckSet {\n      __typename\n      ... on StarterDeckSet {\n        updatedAt\n        decks {\n          name\n          cards {\n            count\n            card {\n              __typename\n              id\n              name\n            }\n          }\n          source {\n            presetDeckId\n            changedSinceCopied\n            presetDeckDeleted\n          }\n        }\n      }\n    }\n  }\n": types.StarterDeckSetDocument,
    "\n  query StarterDeckSetRevision {\n    starterDeckSet {\n      __typename\n      ... on StarterDeckSet {\n        revision\n      }\n    }\n  }\n": types.StarterDeckSetRevisionDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Cards($filter: CardFilter, $after: String) {\n    cards(filter: $filter, after: $after) {\n      __typename\n      ... on CardConnection {\n        edges {\n          node {\n            __typename\n            id\n            name\n            registeredAt\n            updatedAt\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').CardsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RegisterCreature($input: RegisterCreatureInput!) {\n    registerCreature(input: $input) {\n      __typename\n      ... on RegisterCreatureSuccess {\n        creature {\n          name\n        }\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').RegisterCreatureDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RegisterItem($input: RegisterItemInput!) {\n    registerItem(input: $input) {\n      __typename\n      ... on RegisterItemSuccess {\n        item {\n          name\n        }\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').RegisterItemDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RenamePresetDeck($input: RenamePresetDeckInput!) {\n    renamePresetDeck(input: $input) {\n      __typename\n      ... on RenamePresetDeckSuccess {\n        id\n        revision\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').RenamePresetDeckDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetPresetDeckCardCounts($input: SetPresetDeckCardCountsInput!) {\n    setPresetDeckCardCounts(input: $input) {\n      __typename\n      ... on SetPresetDeckCardCountsSuccess {\n        id\n        revision\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          field\n          ... on FieldOutOfRange {\n            min\n            max\n          }\n          ... on FieldTotalTooLarge {\n            max\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').SetPresetDeckCardCountsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeletePresetDeck($input: DeletePresetDeckInput!) {\n    deletePresetDeck(input: $input) {\n      __typename\n    }\n  }\n"): typeof import('./graphql').DeletePresetDeckDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query PresetDeck($id: UUID!) {\n    presetDeck(id: $id) {\n      __typename\n      ... on PresetDeck {\n        id\n        name\n        cards {\n          count\n          card {\n            __typename\n            id\n            name\n          }\n        }\n        totalCount\n        revision\n        registeredAt\n        updatedAt\n      }\n    }\n  }\n"): typeof import('./graphql').PresetDeckDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query DeckCandidateCards($filter: CardFilter, $after: String) {\n    cards(filter: $filter, after: $after) {\n      __typename\n      ... on CardConnection {\n        edges {\n          node {\n            __typename\n            id\n            name\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').DeckCandidateCardsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RegisterPresetDeck($input: RegisterPresetDeckInput!) {\n    registerPresetDeck(input: $input) {\n      __typename\n      ... on RegisterPresetDeckSuccess {\n        id\n        revision\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').RegisterPresetDeckDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query PresetDecks($filter: PresetDeckFilter, $after: String) {\n    presetDecks(filter: $filter, after: $after) {\n      __typename\n      ... on PresetDeckConnection {\n        edges {\n          node {\n            id\n            name\n            totalCount\n            registeredAt\n            updatedAt\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').PresetDecksDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query PresetDeckRevision($id: UUID!) {\n    presetDeck(id: $id) {\n      __typename\n      ... on PresetDeck {\n        revision\n      }\n    }\n  }\n"): typeof import('./graphql').PresetDeckRevisionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RegisterSpell($input: RegisterSpellInput!) {\n    registerSpell(input: $input) {\n      __typename\n      ... on RegisterSpellSuccess {\n        spell {\n          name\n        }\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          ... on FieldTooLong {\n            max\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').RegisterSpellDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetStarterDeckSet($input: SetStarterDeckSetInput!) {\n    setStarterDeckSet(input: $input) {\n      __typename\n      ... on SetStarterDeckSetSuccess {\n        revision\n      }\n      ... on ValidationErrors {\n        errors {\n          __typename\n          field\n          ... on FieldOutOfRange {\n            min\n            max\n          }\n          ... on FieldTotalMismatch {\n            required\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').SetStarterDeckSetDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query StarterDeckSetForEdit {\n    starterDeckSet {\n      __typename\n      ... on StarterDeckSet {\n        revision\n      }\n    }\n  }\n"): typeof import('./graphql').StarterDeckSetForEditDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SelectedPresetDeck($id: UUID!) {\n    presetDeck(id: $id) {\n      __typename\n      ... on PresetDeck {\n        name\n        totalCount\n      }\n    }\n  }\n"): typeof import('./graphql').SelectedPresetDeckDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query StarterDeckSetCandidates($filter: PresetDeckFilter, $after: String) {\n    presetDecks(filter: $filter, after: $after) {\n      __typename\n      ... on PresetDeckConnection {\n        edges {\n          node {\n            id\n            name\n            totalCount\n          }\n        }\n        pageInfo {\n          hasNextPage\n          endCursor\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').StarterDeckSetCandidatesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query StarterDeckSet {\n    starterDeckSet {\n      __typename\n      ... on StarterDeckSet {\n        updatedAt\n        decks {\n          name\n          cards {\n            count\n            card {\n              __typename\n              id\n              name\n            }\n          }\n          source {\n            presetDeckId\n            changedSinceCopied\n            presetDeckDeleted\n          }\n        }\n      }\n    }\n  }\n"): typeof import('./graphql').StarterDeckSetDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query StarterDeckSetRevision {\n    starterDeckSet {\n      __typename\n      ... on StarterDeckSet {\n        revision\n      }\n    }\n  }\n"): typeof import('./graphql').StarterDeckSetRevisionDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
