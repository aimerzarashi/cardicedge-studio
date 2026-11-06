/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { DocumentTypeDecoration } from '@graphql-typed-document-node/core';
/** つなぐマスの入力（向きは無い。a と b を入れ替えても同じつながり） */
export type BoardConnectionInput = {
  /** 片方の端（マスが置いてある座標） */
  a: BoardPositionInput;
  /** もう片方の端（a の上下左右に隣り合う、マスが置いてある座標） */
  b: BoardPositionInput;
};

/** ボードの一覧の絞り込み */
export type BoardFilter = {
  /** 名前に含まれる文字（前後の空白を除き、全角・半角、大文字・小文字の違いは無視する。空・空白だけは入力の誤り。50 文字まで） */
  nameContains?: string | null | undefined;
  /** 状態（指定が無ければすべて。空のリストは入力の誤り） */
  statuses?: Array<BoardStatus> | null | undefined;
};

/** つながりの端の座標の入力 */
export type BoardPositionInput = {
  /** 列 */
  x: number;
  /** 行 */
  y: number;
};

/**
 * ボードの状態。準備中は名前・レイアウトを自由に変えられ、公開の条件を満たさなくてよい。公開中は公開の条件を満たす。
 * 使用不可は新しい対戦に使わない
 */
export type BoardStatus =
  /** 準備中（登録したときの状態） */
  | 'DRAFT'
  /** 公開中 */
  | 'PUBLISHED'
  /** 使用不可 */
  | 'RETIRED';

/**
 * 土地の属性。土地は必ずどれか 1 つを持つ（火属性の土地・地属性の土地 等）。拠点・チェックポイントは持たない。
 * 効き方（地形効果・連鎖・属性の変更のコスト等）は対戦の決まりで、ここでは決めない
 */
export type BoardTileAttribute =
  /** 地（地属性） */
  | 'EARTH'
  /** 火（火属性） */
  | 'FIRE'
  /** 複（複属性）。火・地・水・風の 4 色のマークが描かれた特殊な土地。組み合わせは持たない（属性の値の 1 つ） */
  | 'MULTI'
  /** 無（無属性） */
  | 'NEUTRAL'
  /** 水（水属性） */
  | 'WATER'
  /** 風（風属性） */
  | 'WIND';

/** 置くマスの入力。land・base・checkpoint・warp・bridge・sanctuary・shrine・prophecyShop・cardShop のうち、ちょうど 1 つだけを書く（書いた項目が種類になる） */
export type BoardTileInput =
  {   /** 拠点 */
  base: TilePositionInput; bridge?: never; cardShop?: never; checkpoint?: never; land?: never; prophecyShop?: never; sanctuary?: never; shrine?: never; warp?: never; }
  |  { base?: never;   /** 橋（属性は持たない。対は pairs で指す） */
  bridge: TilePositionInput; cardShop?: never; checkpoint?: never; land?: never; prophecyShop?: never; sanctuary?: never; shrine?: never; warp?: never; }
  |  { base?: never; bridge?: never;   /** カード屋（属性は持たない） */
  cardShop: TilePositionInput; checkpoint?: never; land?: never; prophecyShop?: never; sanctuary?: never; shrine?: never; warp?: never; }
  |  { base?: never; bridge?: never; cardShop?: never;   /** チェックポイント */
  checkpoint: TilePositionInput; land?: never; prophecyShop?: never; sanctuary?: never; shrine?: never; warp?: never; }
  |  { base?: never; bridge?: never; cardShop?: never; checkpoint?: never;   /** 土地 */
  land: LandTileInput; prophecyShop?: never; sanctuary?: never; shrine?: never; warp?: never; }
  |  { base?: never; bridge?: never; cardShop?: never; checkpoint?: never; land?: never;   /** 占い館（属性は持たない） */
  prophecyShop: TilePositionInput; sanctuary?: never; shrine?: never; warp?: never; }
  |  { base?: never; bridge?: never; cardShop?: never; checkpoint?: never; land?: never; prophecyShop?: never;   /** 聖堂（属性は持たない） */
  sanctuary: TilePositionInput; shrine?: never; warp?: never; }
  |  { base?: never; bridge?: never; cardShop?: never; checkpoint?: never; land?: never; prophecyShop?: never; sanctuary?: never;   /** ほこら（属性は持たない） */
  shrine: TilePositionInput; warp?: never; }
  |  { base?: never; bridge?: never; cardShop?: never; checkpoint?: never; land?: never; prophecyShop?: never; sanctuary?: never; shrine?: never;   /** 転送円（属性は持たない。対は pairs で指す） */
  warp: TilePositionInput; };

/** 対にするマスの入力（転送円どうし・橋どうし。向きは無い。a と b を入れ替えても同じ対で、離れていてよい） */
export type BoardTilePairInput = {
  /** 片方の端（転送円または橋が置いてある座標） */
  a: BoardPositionInput;
  /** もう片方の端（a と同じ種類のマスが置いてある、a と違う座標） */
  b: BoardPositionInput;
};

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

/** ボードの既定のルールを変える入力（変えた後の 7 つの値の全体） */
export type ChangeBoardDefaultRulesInput = {
  /** チェックポイントのボーナス（0 以上） */
  checkpointBonus: number;
  /** サイコロの目の最大（最小以上でなければ入力の誤り） */
  diceMax: number;
  /** サイコロの目の最小（1 以上） */
  diceMin: number;
  /** ボードの公開用の ID */
  id: string;
  /** 周回のボーナス（0 以上） */
  lapBonus: number;
  /** 画面が見ていたボードの revision */
  revision: number;
  /** ラウンドの上限（1 以上） */
  roundLimit: number;
  /** 開始時の魔力（0 以上） */
  startingMagic: number;
  /** 目標の魔力（1 以上。開始時の魔力より大きくなければ入力の誤り） */
  targetMagic: number;
};

/** ボードのレイアウトを変える入力（変えた後の全体。前の内容は引き継がれず、ここに無いマス・つながりは消える） */
export type ChangeBoardLayoutInput = {
  /** つながりの全体（両端にマスが置いてあり、隣どうしであること。同じつながりを 2 回入れると入力の誤り） */
  connections: Array<BoardConnectionInput>;
  /** 高さ（studioRules.board の範囲の中。外なら入力の誤り） */
  height: number;
  /** ボードの公開用の ID */
  id: string;
  /** 対の全体（転送円どうし・橋どうし。端にマスが置いてあり、同じ種類で、別の座標であること。同じマスを 2 つの対に入れる、同じ対を 2 回入れると入力の誤り。相手のいない転送円・橋は保存できる）。対が無ければ空のリスト */
  pairs: Array<BoardTilePairInput>;
  /** 画面が見ていたボードの revision */
  revision: number;
  /** 置くマスの全体（同じ座標を 2 回入れると入力の誤り） */
  tiles: Array<BoardTileInput>;
  /** 幅（studioRules.board の範囲の中。外なら入力の誤り） */
  width: number;
};

/** ボードのレイアウトを保存せずに判定する入力（変えた後の全体。changeBoardLayout の入力から、ボードの id と revision を除いたもの） */
export type CheckBoardLayoutInput = {
  /** つながりの全体（両端にマスが置いてあり、隣どうしであること。同じつながりを 2 回入れると入力の誤り） */
  connections: Array<BoardConnectionInput>;
  /** 高さ（studioRules.board の範囲の中。外なら入力の誤り） */
  height: number;
  /** 対の全体（転送円どうし・橋どうし。changeBoardLayout と同じ決まり）。対が無ければ空のリスト */
  pairs: Array<BoardTilePairInput>;
  /** 置くマスの全体（同じ座標を 2 回入れると入力の誤り） */
  tiles: Array<BoardTileInput>;
  /** 幅（studioRules.board の範囲の中。外なら入力の誤り） */
  width: number;
};

/** 変えるカードと、その枚数 */
export type DeckCardCountInput = {
  /** カード（Creature・Item・Spell）の公開用の ID */
  cardId: string;
  /** その枚数にする（0〜4。0 にするとデッキから外す） */
  count: number;
};

/** ボードを削除する入力 */
export type DeleteBoardInput = {
  /** ボードの公開用の ID */
  id: string;
  /** 画面が見ていたボードの revision */
  revision: number;
};

/** 配布デッキを削除する入力 */
export type DeleteGrantDeckInput = {
  /** 配布デッキの公開用の ID */
  id: string;
  /** 画面が見ていた配布デッキの revision */
  revision: number;
};

/** NPC のアバターを削除する入力 */
export type DeleteNpcAvatarInput = {
  /** NPC のアバターの公開用の ID */
  id: string;
  /** 画面が見ていた NPC のアバターの revision */
  revision: number;
};

/** NPC のデッキを削除する入力 */
export type DeleteNpcDeckInput = {
  /** NPC のデッキの公開用の ID */
  id: string;
  /** 画面が見ていた NPC のデッキの revision */
  revision: number;
};

/** プリセットデッキを削除する入力 */
export type DeletePresetDeckInput = {
  /** プリセットデッキの公開用の ID */
  id: string;
  /** 画面が見ていたプリセットデッキの revision */
  revision: number;
};

/** スターターセットを削除する入力 */
export type DeleteStarterSetInput = {
  /** スターターセットの公開用の ID */
  id: string;
  /** 画面が見ていたスターターセットの revision */
  revision: number;
};

/** 配布デッキの一覧の絞り込み */
export type GrantDeckFilter = {
  /** 名前に含まれる文字（前後の空白を除き、全角・半角、大文字・小文字の違いは無視する。空・空白だけは入力の誤り。50 文字まで） */
  nameContains?: string | null | undefined;
  /** 状態（指定が無ければすべて。空のリストは入力の誤り） */
  statuses?: Array<GrantDeckStatus> | null | undefined;
};

/**
 * 配布デッキの状態。準備中は名前・カードを自由に変えられ、決まり（40 枚等）を満たさなくてよい。公開中は決まりを満たし、
 * 新しいプレイヤーに配る。使用不可は配らない（配り済みのデッキはプレイヤーの持ち物なので変わらない）
 */
export type GrantDeckStatus =
  /** 準備中（登録したときの状態） */
  | 'DRAFT'
  /** 公開中 */
  | 'PUBLISHED'
  /** 使用不可 */
  | 'RETIRED';

/** 置く土地の入力 */
export type LandTileInput = {
  /** 属性 */
  attribute: BoardTileAttribute;
  /** 列（0 以上、幅 − 1 以下） */
  x: number;
  /** 行（0 以上、高さ − 1 以下） */
  y: number;
};

/** NPC のアバターの一覧の絞り込み */
export type NpcAvatarFilter = {
  /** 名前に含まれる文字（前後の空白を除き、全角・半角、大文字・小文字の違いは無視する。空・空白だけは入力の誤り。50 文字まで） */
  nameContains?: string | null | undefined;
  /** 状態（指定が無ければすべて。空のリストは入力の誤り） */
  statuses?: Array<NpcAvatarStatus> | null | undefined;
};

/**
 * NPC のアバターの状態。準備中は名前と使うデッキを自由に変えられる。公開中の数に上限は無い。
 * 公開中にできるのは、使うデッキに公開中のものが 1 つ以上あるとき。使用不可は新しい対戦に使わない
 */
export type NpcAvatarStatus =
  /** 準備中（登録したときの状態） */
  | 'DRAFT'
  /** 公開中 */
  | 'PUBLISHED'
  /** 使用不可 */
  | 'RETIRED';

/** NPC のデッキの一覧の絞り込み */
export type NpcDeckFilter = {
  /** 名前に含まれる文字（前後の空白を除き、全角・半角、大文字・小文字の違いは無視する。空・空白だけは入力の誤り。50 文字まで） */
  nameContains?: string | null | undefined;
  /** 状態（指定が無ければすべて。空のリストは入力の誤り） */
  statuses?: Array<NpcDeckStatus> | null | undefined;
};

/**
 * NPC のデッキの状態。準備中は名前・カードを自由に変えられ、決まり（40 枚等）を満たさなくてよい。公開中は決まりを満たす。
 * 公開中の数に上限は無い。使用不可は新しい対戦に使わない
 */
export type NpcDeckStatus =
  /** 準備中（登録したときの状態） */
  | 'DRAFT'
  /** 公開中 */
  | 'PUBLISHED'
  /** 使用不可 */
  | 'RETIRED';

/** プリセットデッキの一覧の絞り込み */
export type PresetDeckFilter = {
  /** 名前に含まれる文字（前後の空白を除き、全角・半角、大文字・小文字の違いは無視する。空・空白だけは入力の誤り。50 文字まで） */
  nameContains?: string | null | undefined;
};

/** ボードを公開する入力 */
export type PublishBoardInput = {
  /** ボードの公開用の ID */
  id: string;
  /** 画面が見ていたボードの revision */
  revision: number;
};

/** カードを公開中にする入力 */
export type PublishCardInput = {
  /** カード（Creature・Item・Spell）の公開用の ID */
  id: string;
  /** 画面が見ていたカードの revision */
  revision: number;
};

/** 配布デッキを公開する入力 */
export type PublishGrantDeckInput = {
  /** 配布デッキの公開用の ID */
  id: string;
  /** 画面が見ていた配布デッキの revision */
  revision: number;
};

/** NPC のアバターを公開する入力 */
export type PublishNpcAvatarInput = {
  /** NPC のアバターの公開用の ID */
  id: string;
  /** 画面が見ていた NPC のアバターの revision */
  revision: number;
};

/** NPC のデッキを公開する入力 */
export type PublishNpcDeckInput = {
  /** NPC のデッキの公開用の ID */
  id: string;
  /** 画面が見ていた NPC のデッキの revision */
  revision: number;
};

/** スターターセットを公開する入力 */
export type PublishStarterSetInput = {
  /** スターターセットの公開用の ID */
  id: string;
  /** 画面が見ていたスターターセットの revision */
  revision: number;
};

/** ボードを登録する入力 */
export type RegisterBoardInput = {
  /** 名前（1〜50 文字。前後の空白は除いて保存する） */
  name: string;
};

/** クリーチャーを登録する入力 */
export type RegisterCreatureInput = {
  /** カード名（1〜50 文字。前後の空白は除いて保存する） */
  name: string;
};

/** 配布デッキをプリセットデッキから写して登録する入力 */
export type RegisterGrantDeckFromPresetDeckInput = {
  /** 名前（1〜50 文字。前後の空白は除いて保存する。元のプリセットデッキの名前は写さない） */
  name: string;
  /** 写す元のプリセットデッキの公開用の ID（カードと枚数を写す。合計が 40 枚でなくてもよい） */
  presetDeckId: string;
};

/** 配布デッキを空から登録する入力 */
export type RegisterGrantDeckInput = {
  /** 名前（1〜50 文字。前後の空白は除いて保存する） */
  name: string;
};

/** アイテムを登録する入力 */
export type RegisterItemInput = {
  /** カード名（1〜50 文字。前後の空白は除いて保存する） */
  name: string;
};

/** NPC のアバターを登録する入力 */
export type RegisterNpcAvatarInput = {
  /** 名前（1〜20 文字。前後の空白は除いて保存する） */
  name: string;
};

/** NPC のデッキをプリセットデッキから写して登録する入力 */
export type RegisterNpcDeckFromPresetDeckInput = {
  /** 名前（1〜50 文字。前後の空白は除いて保存する。元のプリセットデッキの名前は写さない） */
  name: string;
  /** 写す元のプリセットデッキの公開用の ID（カードと枚数を写す。合計が 40 枚でなくてもよい） */
  presetDeckId: string;
};

/** NPC のデッキを空から登録する入力 */
export type RegisterNpcDeckInput = {
  /** 名前（1〜50 文字。前後の空白は除いて保存する） */
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

/** スターターセットを登録する入力 */
export type RegisterStarterSetInput = {
  /** 名前（1〜20 文字。前後の空白は除いて保存する） */
  name: string;
};

/** ボードの名前を変える入力 */
export type RenameBoardInput = {
  /** ボードの公開用の ID */
  id: string;
  /** 新しい名前（1〜50 文字。前後の空白は除いて保存する） */
  name: string;
  /** 画面が見ていたボードの revision */
  revision: number;
};

/** 配布デッキの名前を変える入力 */
export type RenameGrantDeckInput = {
  /** 配布デッキの公開用の ID */
  id: string;
  /** 新しい名前（1〜50 文字。前後の空白は除いて保存する） */
  name: string;
  /** 画面が見ていた配布デッキの revision */
  revision: number;
};

/** NPC のアバターの名前を変える入力 */
export type RenameNpcAvatarInput = {
  /** NPC のアバターの公開用の ID */
  id: string;
  /** 新しい名前（1〜20 文字。前後の空白は除いて保存する） */
  name: string;
  /** 画面が見ていた NPC のアバターの revision */
  revision: number;
};

/** NPC のデッキの名前を変える入力 */
export type RenameNpcDeckInput = {
  /** NPC のデッキの公開用の ID */
  id: string;
  /** 新しい名前（1〜50 文字。前後の空白は除いて保存する） */
  name: string;
  /** 画面が見ていた NPC のデッキの revision */
  revision: number;
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

/** スターターセットの名前を変える入力 */
export type RenameStarterSetInput = {
  /** スターターセットの公開用の ID */
  id: string;
  /** 新しい名前（1〜20 文字。前後の空白は除いて保存する） */
  name: string;
  /** 画面が見ていたスターターセットの revision */
  revision: number;
};

/** ボードを使用不可にする入力 */
export type RetireBoardInput = {
  /** ボードの公開用の ID */
  id: string;
  /** 画面が見ていたボードの revision */
  revision: number;
};

/** カードを使用不可にする入力 */
export type RetireCardInput = {
  /** カード（Creature・Item・Spell）の公開用の ID */
  id: string;
  /** 画面が見ていたカードの revision */
  revision: number;
};

/** 配布デッキを使用不可にする入力 */
export type RetireGrantDeckInput = {
  /** 配布デッキの公開用の ID */
  id: string;
  /** 画面が見ていた配布デッキの revision */
  revision: number;
};

/** NPC のアバターを使用不可にする入力 */
export type RetireNpcAvatarInput = {
  /** NPC のアバターの公開用の ID */
  id: string;
  /** 画面が見ていた NPC のアバターの revision */
  revision: number;
};

/** NPC のデッキを使用不可にする入力 */
export type RetireNpcDeckInput = {
  /** NPC のデッキの公開用の ID */
  id: string;
  /** 画面が見ていた NPC のデッキの revision */
  revision: number;
};

/** スターターセットを使用不可にする入力 */
export type RetireStarterSetInput = {
  /** スターターセットの公開用の ID */
  id: string;
  /** 画面が見ていたスターターセットの revision */
  revision: number;
};

/** 配布デッキのカードの枚数を変える入力 */
export type SetGrantDeckCardCountsInput = {
  /** 変えるカードだけの一覧（40 件まで。変えないカードは含めなくてよい。同じカードを 2 回入れると入力の誤り。空なら何も変えない。変えた後の枚数の合計が 40 を超えると入力の誤り。新しく入れる・増やすカードは公開中だけ） */
  cards: Array<DeckCardCountInput>;
  /** 配布デッキの公開用の ID */
  id: string;
  /** 画面が見ていた配布デッキの revision */
  revision: number;
};

/** NPC のアバターに使うデッキを割り当てる入力 */
export type SetNpcAvatarDecksInput = {
  /** 使う NPC のデッキの公開用の ID（今の一覧をこの一覧に置き換える。今の一覧に無いものは後ろに足し、この一覧に無いものは外す。並べ替えだけでは変わらない。0 件でもよい。同じデッキは 2 回入れられない。新しく入れるデッキは公開中のものだけ） */
  deckIds: Array<string>;
  /** NPC のアバターの公開用の ID */
  id: string;
  /** 画面が見ていた NPC のアバターの revision */
  revision: number;
};

/** NPC のデッキのカードの枚数を変える入力 */
export type SetNpcDeckCardCountsInput = {
  /** 変えるカードだけの一覧（40 件まで。変えないカードは含めなくてよい。同じカードを 2 回入れると入力の誤り。空なら何も変えない。変えた後の枚数の合計が 40 を超えると入力の誤り。新しく入れる・増やすカードは公開中だけ） */
  cards: Array<DeckCardCountInput>;
  /** NPC のデッキの公開用の ID */
  id: string;
  /** 画面が見ていた NPC のデッキの revision */
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

/** スターターセットの配るデッキを指定する入力 */
export type SetStarterSetGrantDecksInput = {
  /** 配るデッキ（配布デッキ）の公開用の ID（今の一覧をこの一覧に置き換える。今の一覧に無いものは後ろに足し、この一覧に無いものは外す。並べ替えだけでは変わらない。0 件でもよい。同じデッキは 2 回入れられない。新しく入れるデッキは公開中のものだけ） */
  grantDeckIds: Array<string>;
  /** スターターセットの公開用の ID */
  id: string;
  /** 画面が見ていたスターターセットの revision */
  revision: number;
};

/** スターターセットの解放するボードを指定する入力 */
export type SetStarterSetUnlockBoardsInput = {
  /** スターターセットの公開用の ID */
  id: string;
  /** 画面が見ていたスターターセットの revision */
  revision: number;
  /** 解放するボードの公開用の ID（今の一覧をこの一覧に置き換える。今の一覧に無いものは後ろに足し、この一覧に無いものは外す。並べ替えだけでは変わらない。0 件でもよい。同じボードは 2 回入れられない。新しく入れるボードは公開中のものだけ） */
  unlockBoardIds: Array<string>;
};

/** スターターセットの解放する NPC のアバターを指定する入力 */
export type SetStarterSetUnlockNpcAvatarsInput = {
  /** スターターセットの公開用の ID */
  id: string;
  /** 画面が見ていたスターターセットの revision */
  revision: number;
  /** 解放する NPC のアバターの公開用の ID（今の一覧をこの一覧に置き換える。今の一覧に無いものは後ろに足し、この一覧に無いものは外す。並べ替えだけでは変わらない。0 件でもよい。同じアバターは 2 回入れられない。新しく入れるアバターは公開中のものだけ） */
  unlockNpcAvatarIds: Array<string>;
};

/** スターターセットの一覧の絞り込み */
export type StarterSetFilter = {
  /** 名前に含まれる文字（前後の空白を除き、全角・半角、大文字・小文字の違いは無視する。空・空白だけは入力の誤り。50 文字まで） */
  nameContains?: string | null | undefined;
  /** 状態（指定が無ければすべて。空のリストは入力の誤り） */
  statuses?: Array<StarterSetStatus> | null | undefined;
};

/**
 * スターターセットの状態。準備中は名前・配るデッキ・解放するボードを自由に変えられる。公開中にできるのは同時に 1 つだけで、
 * 配るデッキが 1 つ以上あるとき。公開中は中身を変えられない（変えたいときは使用不可にして新しく作る）
 */
export type StarterSetStatus =
  /** 準備中（登録したときの状態） */
  | 'DRAFT'
  /** 公開中 */
  | 'PUBLISHED'
  /** 使用不可 */
  | 'RETIRED';

/** 置く拠点・チェックポイント・転送円・橋・施設の座標の入力 */
export type TilePositionInput = {
  /** 列（0 以上、幅 − 1 以下） */
  x: number;
  /** 行（0 以上、高さ − 1 以下） */
  y: number;
};

export type RenameBoardMutationVariables = Exact<{
  input: RenameBoardInput;
}>;


export type RenameBoardMutation = { renameBoard:
    | { __typename: 'BoardNameAlreadyInUseError' }
    | { __typename: 'BoardNotDraftError' }
    | { __typename: 'BoardNotFoundError' }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RenameBoardSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type ChangeBoardDefaultRulesMutationVariables = Exact<{
  input: ChangeBoardDefaultRulesInput;
}>;


export type ChangeBoardDefaultRulesMutation = { changeBoardDefaultRules:
    | { __typename: 'BoardNotDraftError' }
    | { __typename: 'BoardNotFoundError' }
    | { __typename: 'ChangeBoardDefaultRulesSuccess', id: string, revision: number }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated', field: string }
        | { __typename: 'FieldInvalidFormat', field: string }
        | { __typename: 'FieldNotAdjacent', field: string }
        | { __typename: 'FieldNotFound', field: string }
        | { __typename: 'FieldNotGreaterThan', than: string, field: string }
        | { __typename: 'FieldNotPairable', field: string }
        | { __typename: 'FieldOutOfRange', field: string }
        | { __typename: 'FieldPairKindMismatch', field: string }
        | { __typename: 'FieldPairedWithSelf', field: string }
        | { __typename: 'FieldRequired', field: string }
        | { __typename: 'FieldTooLong', field: string }
        | { __typename: 'FieldTooSmall', min: number, field: string }
        | { __typename: 'FieldTotalMismatch', field: string }
        | { __typename: 'FieldTotalTooLarge', field: string }
        | { __typename: 'FieldUnavailable', field: string }
      > }
   };

export type CheckBoardLayoutQueryVariables = Exact<{
  input: CheckBoardLayoutInput;
}>;


export type CheckBoardLayoutQuery = { checkBoardLayout:
    | { __typename: 'CheckBoardLayoutSuccess', publishProblems: Array<
        | { __typename: 'BaseCountProblem', positions: Array<{ x: number, y: number }> }
        | { __typename: 'NoCheckpointProblem' }
        | { __typename: 'UnpairedTilesProblem', positions: Array<{ x: number, y: number }> }
        | { __typename: 'UnreachableTilesProblem', positions: Array<{ x: number, y: number }> }
      > }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated', field: string }
        | { __typename: 'FieldInvalidFormat', field: string }
        | { __typename: 'FieldNotAdjacent', field: string }
        | { __typename: 'FieldNotFound', field: string }
        | { __typename: 'FieldNotGreaterThan', field: string }
        | { __typename: 'FieldNotPairable', field: string }
        | { __typename: 'FieldOutOfRange', min: number, max: number, field: string }
        | { __typename: 'FieldPairKindMismatch', field: string }
        | { __typename: 'FieldPairedWithSelf', field: string }
        | { __typename: 'FieldRequired', field: string }
        | { __typename: 'FieldTooLong', field: string }
        | { __typename: 'FieldTooSmall', field: string }
        | { __typename: 'FieldTotalMismatch', field: string }
        | { __typename: 'FieldTotalTooLarge', field: string }
        | { __typename: 'FieldUnavailable', field: string }
      > }
   };

export type DeleteBoardMutationVariables = Exact<{
  input: DeleteBoardInput;
}>;


export type DeleteBoardMutation = { deleteBoard:
    | { __typename: 'BoardNotDraftError' }
    | { __typename: 'BoardNotFoundError' }
    | { __typename: 'DeleteBoardSuccess' }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RevisionConflictError' }
   };

export type RetireBoardMutationVariables = Exact<{
  input: RetireBoardInput;
}>;


export type RetireBoardMutation = { retireBoard:
    | { __typename: 'BoardNotFoundError' }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'InvalidBoardStatusTransitionError' }
    | { __typename: 'RetireBoardSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
   };

export type BoardQueryVariables = Exact<{
  id: string;
}>;


export type BoardQuery = { board:
    | { __typename: 'Board', id: string, name: string, status: BoardStatus, width: number, height: number, revision: number, registeredAt: string, updatedAt: string, tiles: Array<
        | { __typename: 'BaseTile', x: number, y: number }
        | { __typename: 'BridgeTile', x: number, y: number }
        | { __typename: 'CardShopTile', x: number, y: number }
        | { __typename: 'CheckpointTile', x: number, y: number }
        | { __typename: 'LandTile', attribute: BoardTileAttribute, x: number, y: number }
        | { __typename: 'ProphecyShopTile', x: number, y: number }
        | { __typename: 'SanctuaryTile', x: number, y: number }
        | { __typename: 'ShrineTile', x: number, y: number }
        | { __typename: 'WarpTile', x: number, y: number }
      >, defaultRules: { targetMagic: number, startingMagic: number, lapBonus: number, checkpointBonus: number, roundLimit: number, diceMin: number, diceMax: number }, publishProblems: Array<
        | { __typename: 'BaseCountProblem', positions: Array<{ x: number, y: number }> }
        | { __typename: 'NoCheckpointProblem' }
        | { __typename: 'UnpairedTilesProblem', positions: Array<{ x: number, y: number }> }
        | { __typename: 'UnreachableTilesProblem', positions: Array<{ x: number, y: number }> }
      >, connections: Array<{ a: { x: number, y: number }, b: { x: number, y: number } }>, pairs: Array<{ a: { x: number, y: number }, b: { x: number, y: number } }> }
    | { __typename: 'BoardNotFoundError' }
    | { __typename: 'ForbiddenError' }
  , studioRules:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'StudioRules', board: { minSize: number, maxSize: number } }
   };

export type BoardRevisionQueryVariables = Exact<{
  id: string;
}>;


export type BoardRevisionQuery = { board:
    | { __typename: 'Board', revision: number }
    | { __typename: 'BoardNotFoundError' }
    | { __typename: 'ForbiddenError' }
   };

export type ChangeBoardLayoutMutationVariables = Exact<{
  input: ChangeBoardLayoutInput;
}>;


export type ChangeBoardLayoutMutation = { changeBoardLayout:
    | { __typename: 'BoardNotDraftError' }
    | { __typename: 'BoardNotFoundError' }
    | { __typename: 'ChangeBoardLayoutSuccess', id: string, revision: number }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated', field: string }
        | { __typename: 'FieldInvalidFormat', field: string }
        | { __typename: 'FieldNotAdjacent', field: string }
        | { __typename: 'FieldNotFound', field: string }
        | { __typename: 'FieldNotGreaterThan', field: string }
        | { __typename: 'FieldNotPairable', field: string }
        | { __typename: 'FieldOutOfRange', min: number, max: number, field: string }
        | { __typename: 'FieldPairKindMismatch', field: string }
        | { __typename: 'FieldPairedWithSelf', field: string }
        | { __typename: 'FieldRequired', field: string }
        | { __typename: 'FieldTooLong', field: string }
        | { __typename: 'FieldTooSmall', field: string }
        | { __typename: 'FieldTotalMismatch', field: string }
        | { __typename: 'FieldTotalTooLarge', field: string }
        | { __typename: 'FieldUnavailable', field: string }
      > }
   };

export type PublishBoardMutationVariables = Exact<{
  input: PublishBoardInput;
}>;


export type PublishBoardMutation = { publishBoard:
    | { __typename: 'BoardNotFoundError' }
    | { __typename: 'BoardNotPublishableError', problems: Array<
        | { __typename: 'BaseCountProblem', positions: Array<{ x: number, y: number }> }
        | { __typename: 'NoCheckpointProblem' }
        | { __typename: 'UnpairedTilesProblem', positions: Array<{ x: number, y: number }> }
        | { __typename: 'UnreachableTilesProblem', positions: Array<{ x: number, y: number }> }
      > }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'PublishBoardSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
   };

export type RegisterBoardMutationVariables = Exact<{
  input: RegisterBoardInput;
}>;


export type RegisterBoardMutation = { registerBoard:
    | { __typename: 'BoardNameAlreadyInUseError' }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RegisterBoardSuccess', id: string, revision: number }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type BoardsQueryVariables = Exact<{
  filter?: BoardFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type BoardsQuery = { boards:
    | { __typename: 'BoardsConnection', edges: Array<{ node: { id: string, name: string, status: BoardStatus, width: number, height: number, registeredAt: string, updatedAt: string, tileCounts: { land: number, base: number, checkpoint: number, fire: number, earth: number, water: number, wind: number, neutral: number, multi: number, warp: number, bridge: number, sanctuary: number, shrine: number, prophecyShop: number, cardShop: number }, defaultRules: { targetMagic: number, startingMagic: number, lapBonus: number, checkpointBonus: number, roundLimit: number, diceMin: number, diceMax: number }, publishProblems: Array<
            | { __typename: 'BaseCountProblem' }
            | { __typename: 'NoCheckpointProblem' }
            | { __typename: 'UnpairedTilesProblem' }
            | { __typename: 'UnreachableTilesProblem' }
          > } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'ValidationErrors' }
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

export type RegisterCreatureMutationVariables = Exact<{
  input: RegisterCreatureInput;
}>;


export type RegisterCreatureMutation = { registerCreature:
    | { __typename: 'CardNameAlreadyInUseError' }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RegisterCreatureSuccess', creature: { id: string, revision: number, name: string } }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
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

export type RenameGrantDeckMutationVariables = Exact<{
  input: RenameGrantDeckInput;
}>;


export type RenameGrantDeckMutation = { renameGrantDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'GrantDeckNameAlreadyInUseError' }
    | { __typename: 'GrantDeckNotDraftError' }
    | { __typename: 'GrantDeckNotFoundError' }
    | { __typename: 'RenameGrantDeckSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type DeleteGrantDeckMutationVariables = Exact<{
  input: DeleteGrantDeckInput;
}>;


export type DeleteGrantDeckMutation = { deleteGrantDeck:
    | { __typename: 'DeleteGrantDeckSuccess' }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'GrantDeckNotDraftError' }
    | { __typename: 'GrantDeckNotFoundError' }
    | { __typename: 'RevisionConflictError' }
   };

export type RetireGrantDeckMutationVariables = Exact<{
  input: RetireGrantDeckInput;
}>;


export type RetireGrantDeckMutation = { retireGrantDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'GrantDeckNotFoundError' }
    | { __typename: 'InvalidGrantDeckStatusTransitionError' }
    | { __typename: 'RetireGrantDeckSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
   };

export type GrantDeckQueryVariables = Exact<{
  id: string;
}>;


export type GrantDeckQuery = { grantDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'GrantDeck', id: string, name: string, status: GrantDeckStatus, totalCount: number, revision: number, registeredAt: string, updatedAt: string, cards: Array<{ count: number, card:
          | { __typename: 'Creature', id: string, name: string }
          | { __typename: 'Item', id: string, name: string }
          | { __typename: 'Spell', id: string, name: string }
         }> }
    | { __typename: 'GrantDeckNotFoundError' }
   };

export type GrantDeckCandidateCardsQueryVariables = Exact<{
  filter?: CardFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type GrantDeckCandidateCardsQuery = { cards:
    | { __typename: 'CardConnection', edges: Array<{ node:
          | { __typename: 'Creature', id: string, name: string }
          | { __typename: 'Item', id: string, name: string }
          | { __typename: 'Spell', id: string, name: string }
         }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'ValidationErrors' }
   };

export type RegisterGrantDeckFromPresetDeckMutationVariables = Exact<{
  input: RegisterGrantDeckFromPresetDeckInput;
}>;


export type RegisterGrantDeckFromPresetDeckMutation = { registerGrantDeckFromPresetDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'GrantDeckNameAlreadyInUseError' }
    | { __typename: 'PresetDeckNotFoundError' }
    | { __typename: 'RegisterGrantDeckFromPresetDeckSuccess', id: string, revision: number }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
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

export type GrantDeckRevisionQueryVariables = Exact<{
  id: string;
}>;


export type GrantDeckRevisionQuery = { grantDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'GrantDeck', revision: number }
    | { __typename: 'GrantDeckNotFoundError' }
   };

export type RegisterGrantDeckMutationVariables = Exact<{
  input: RegisterGrantDeckInput;
}>;


export type RegisterGrantDeckMutation = { registerGrantDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'GrantDeckNameAlreadyInUseError' }
    | { __typename: 'RegisterGrantDeckSuccess', id: string, revision: number }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type SetGrantDeckCardCountsMutationVariables = Exact<{
  input: SetGrantDeckCardCountsInput;
}>;


export type SetGrantDeckCardCountsMutation = { setGrantDeckCardCounts:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'GrantDeckNotDraftError' }
    | { __typename: 'GrantDeckNotFoundError' }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'SetGrantDeckCardCountsSuccess', id: string, revision: number }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated', field: string }
        | { __typename: 'FieldInvalidFormat', field: string }
        | { __typename: 'FieldNotAdjacent', field: string }
        | { __typename: 'FieldNotFound', field: string }
        | { __typename: 'FieldNotGreaterThan', field: string }
        | { __typename: 'FieldNotPairable', field: string }
        | { __typename: 'FieldOutOfRange', min: number, max: number, field: string }
        | { __typename: 'FieldPairKindMismatch', field: string }
        | { __typename: 'FieldPairedWithSelf', field: string }
        | { __typename: 'FieldRequired', field: string }
        | { __typename: 'FieldTooLong', field: string }
        | { __typename: 'FieldTooSmall', field: string }
        | { __typename: 'FieldTotalMismatch', field: string }
        | { __typename: 'FieldTotalTooLarge', max: number, field: string }
        | { __typename: 'FieldUnavailable', field: string }
      > }
   };

export type PublishGrantDeckMutationVariables = Exact<{
  input: PublishGrantDeckInput;
}>;


export type PublishGrantDeckMutation = { publishGrantDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'GrantDeckNotFoundError' }
    | { __typename: 'PublishGrantDeckSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong' }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch', required: number }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type GrantDecksQueryVariables = Exact<{
  filter?: GrantDeckFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type GrantDecksQuery = { grantDecks:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'GrantDeckConnection', edges: Array<{ node: { id: string, name: string, status: GrantDeckStatus, totalCount: number, registeredAt: string, updatedAt: string } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ValidationErrors' }
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
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type RenameNpcAvatarMutationVariables = Exact<{
  input: RenameNpcAvatarInput;
}>;


export type RenameNpcAvatarMutation = { renameNpcAvatar:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcAvatarNameAlreadyInUseError' }
    | { __typename: 'NpcAvatarNotDraftError' }
    | { __typename: 'NpcAvatarNotFoundError' }
    | { __typename: 'RenameNpcAvatarSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type DeleteNpcAvatarMutationVariables = Exact<{
  input: DeleteNpcAvatarInput;
}>;


export type DeleteNpcAvatarMutation = { deleteNpcAvatar:
    | { __typename: 'DeleteNpcAvatarSuccess' }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcAvatarNotDraftError' }
    | { __typename: 'NpcAvatarNotFoundError' }
    | { __typename: 'RevisionConflictError' }
   };

export type RetireNpcAvatarMutationVariables = Exact<{
  input: RetireNpcAvatarInput;
}>;


export type RetireNpcAvatarMutation = { retireNpcAvatar:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'InvalidNpcAvatarStatusTransitionError' }
    | { __typename: 'NpcAvatarNotFoundError' }
    | { __typename: 'RetireNpcAvatarSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
   };

export type NpcAvatarQueryVariables = Exact<{
  id: string;
}>;


export type NpcAvatarQuery = { npcAvatar:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcAvatar', id: string, name: string, status: NpcAvatarStatus, revision: number, registeredAt: string, updatedAt: string, decks: Array<{ id: string, name: string, status: NpcDeckStatus }> }
    | { __typename: 'NpcAvatarNotFoundError' }
   };

export type NpcAvatarCandidateDecksQueryVariables = Exact<{
  filter?: NpcDeckFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type NpcAvatarCandidateDecksQuery = { npcDecks:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcDeckConnection', edges: Array<{ node: { id: string, name: string, totalCount: number } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ValidationErrors' }
   };

export type NpcAvatarRevisionQueryVariables = Exact<{
  id: string;
}>;


export type NpcAvatarRevisionQuery = { npcAvatar:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcAvatar', revision: number }
    | { __typename: 'NpcAvatarNotFoundError' }
   };

export type RegisterNpcAvatarMutationVariables = Exact<{
  input: RegisterNpcAvatarInput;
}>;


export type RegisterNpcAvatarMutation = { registerNpcAvatar:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcAvatarNameAlreadyInUseError' }
    | { __typename: 'RegisterNpcAvatarSuccess', id: string, revision: number }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type SetNpcAvatarDecksMutationVariables = Exact<{
  input: SetNpcAvatarDecksInput;
}>;


export type SetNpcAvatarDecksMutation = { setNpcAvatarDecks:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcAvatarNotDraftError' }
    | { __typename: 'NpcAvatarNotFoundError' }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'SetNpcAvatarDecksSuccess', id: string, revision: number }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong' }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type PublishNpcAvatarMutationVariables = Exact<{
  input: PublishNpcAvatarInput;
}>;


export type PublishNpcAvatarMutation = { publishNpcAvatar:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcAvatarNotFoundError' }
    | { __typename: 'PublishNpcAvatarSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong' }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type NpcAvatarsQueryVariables = Exact<{
  filter?: NpcAvatarFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type NpcAvatarsQuery = { npcAvatars:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcAvatarConnection', edges: Array<{ node: { id: string, name: string, status: NpcAvatarStatus, registeredAt: string, updatedAt: string, decks: Array<{ id: string, name: string }> } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ValidationErrors' }
   };

export type RenameNpcDeckMutationVariables = Exact<{
  input: RenameNpcDeckInput;
}>;


export type RenameNpcDeckMutation = { renameNpcDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcDeckNameAlreadyInUseError' }
    | { __typename: 'NpcDeckNotDraftError' }
    | { __typename: 'NpcDeckNotFoundError' }
    | { __typename: 'RenameNpcDeckSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type DeleteNpcDeckMutationVariables = Exact<{
  input: DeleteNpcDeckInput;
}>;


export type DeleteNpcDeckMutation = { deleteNpcDeck:
    | { __typename: 'DeleteNpcDeckSuccess' }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcDeckNotDraftError' }
    | { __typename: 'NpcDeckNotFoundError' }
    | { __typename: 'RevisionConflictError' }
   };

export type RetireNpcDeckMutationVariables = Exact<{
  input: RetireNpcDeckInput;
}>;


export type RetireNpcDeckMutation = { retireNpcDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'InvalidNpcDeckStatusTransitionError' }
    | { __typename: 'NpcDeckNotFoundError' }
    | { __typename: 'RetireNpcDeckSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
   };

export type NpcDeckQueryVariables = Exact<{
  id: string;
}>;


export type NpcDeckQuery = { npcDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcDeck', id: string, name: string, status: NpcDeckStatus, totalCount: number, revision: number, registeredAt: string, updatedAt: string, cards: Array<{ count: number, card:
          | { __typename: 'Creature', id: string, name: string }
          | { __typename: 'Item', id: string, name: string }
          | { __typename: 'Spell', id: string, name: string }
         }> }
    | { __typename: 'NpcDeckNotFoundError' }
   };

export type NpcDeckCandidateCardsQueryVariables = Exact<{
  filter?: CardFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type NpcDeckCandidateCardsQuery = { cards:
    | { __typename: 'CardConnection', edges: Array<{ node:
          | { __typename: 'Creature', id: string, name: string }
          | { __typename: 'Item', id: string, name: string }
          | { __typename: 'Spell', id: string, name: string }
         }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'ValidationErrors' }
   };

export type RegisterNpcDeckFromPresetDeckMutationVariables = Exact<{
  input: RegisterNpcDeckFromPresetDeckInput;
}>;


export type RegisterNpcDeckFromPresetDeckMutation = { registerNpcDeckFromPresetDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcDeckNameAlreadyInUseError' }
    | { __typename: 'PresetDeckNotFoundError' }
    | { __typename: 'RegisterNpcDeckFromPresetDeckSuccess', id: string, revision: number }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type NpcDeckCopySourcePresetDecksQueryVariables = Exact<{
  filter?: PresetDeckFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type NpcDeckCopySourcePresetDecksQuery = { presetDecks:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'PresetDeckConnection', edges: Array<{ node: { id: string, name: string, totalCount: number } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ValidationErrors' }
   };

export type NpcDeckRevisionQueryVariables = Exact<{
  id: string;
}>;


export type NpcDeckRevisionQuery = { npcDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcDeck', revision: number }
    | { __typename: 'NpcDeckNotFoundError' }
   };

export type RegisterNpcDeckMutationVariables = Exact<{
  input: RegisterNpcDeckInput;
}>;


export type RegisterNpcDeckMutation = { registerNpcDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcDeckNameAlreadyInUseError' }
    | { __typename: 'RegisterNpcDeckSuccess', id: string, revision: number }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type SetNpcDeckCardCountsMutationVariables = Exact<{
  input: SetNpcDeckCardCountsInput;
}>;


export type SetNpcDeckCardCountsMutation = { setNpcDeckCardCounts:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcDeckNotDraftError' }
    | { __typename: 'NpcDeckNotFoundError' }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'SetNpcDeckCardCountsSuccess', id: string, revision: number }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated', field: string }
        | { __typename: 'FieldInvalidFormat', field: string }
        | { __typename: 'FieldNotAdjacent', field: string }
        | { __typename: 'FieldNotFound', field: string }
        | { __typename: 'FieldNotGreaterThan', field: string }
        | { __typename: 'FieldNotPairable', field: string }
        | { __typename: 'FieldOutOfRange', min: number, max: number, field: string }
        | { __typename: 'FieldPairKindMismatch', field: string }
        | { __typename: 'FieldPairedWithSelf', field: string }
        | { __typename: 'FieldRequired', field: string }
        | { __typename: 'FieldTooLong', field: string }
        | { __typename: 'FieldTooSmall', field: string }
        | { __typename: 'FieldTotalMismatch', field: string }
        | { __typename: 'FieldTotalTooLarge', max: number, field: string }
        | { __typename: 'FieldUnavailable', field: string }
      > }
   };

export type PublishNpcDeckMutationVariables = Exact<{
  input: PublishNpcDeckInput;
}>;


export type PublishNpcDeckMutation = { publishNpcDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcDeckNotFoundError' }
    | { __typename: 'PublishNpcDeckSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong' }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch', required: number }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type NpcDecksQueryVariables = Exact<{
  filter?: NpcDeckFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type NpcDecksQuery = { npcDecks:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcDeckConnection', edges: Array<{ node: { id: string, name: string, status: NpcDeckStatus, totalCount: number, registeredAt: string, updatedAt: string } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ValidationErrors' }
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
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
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

export type PresetDeckRevisionQueryVariables = Exact<{
  id: string;
}>;


export type PresetDeckRevisionQuery = { presetDeck:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'PresetDeck', revision: number }
    | { __typename: 'PresetDeckNotFoundError' }
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
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTooSmall' }
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
        | { __typename: 'FieldNotAdjacent', field: string }
        | { __typename: 'FieldNotFound', field: string }
        | { __typename: 'FieldNotGreaterThan', field: string }
        | { __typename: 'FieldNotPairable', field: string }
        | { __typename: 'FieldOutOfRange', min: number, max: number, field: string }
        | { __typename: 'FieldPairKindMismatch', field: string }
        | { __typename: 'FieldPairedWithSelf', field: string }
        | { __typename: 'FieldRequired', field: string }
        | { __typename: 'FieldTooLong', field: string }
        | { __typename: 'FieldTooSmall', field: string }
        | { __typename: 'FieldTotalMismatch', field: string }
        | { __typename: 'FieldTotalTooLarge', max: number, field: string }
        | { __typename: 'FieldUnavailable', field: string }
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
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type RenameStarterSetMutationVariables = Exact<{
  input: RenameStarterSetInput;
}>;


export type RenameStarterSetMutation = { renameStarterSet:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RenameStarterSetSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'StarterSetNameAlreadyInUseError' }
    | { __typename: 'StarterSetNotDraftError' }
    | { __typename: 'StarterSetNotFoundError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type DeleteStarterSetMutationVariables = Exact<{
  input: DeleteStarterSetInput;
}>;


export type DeleteStarterSetMutation = { deleteStarterSet:
    | { __typename: 'DeleteStarterSetSuccess' }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'StarterSetNotDraftError' }
    | { __typename: 'StarterSetNotFoundError' }
   };

export type PublishStarterSetMutationVariables = Exact<{
  input: PublishStarterSetInput;
}>;


export type PublishStarterSetMutation = { publishStarterSet:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'PublishStarterSetSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'StarterSetLimitReachedError', max: number }
    | { __typename: 'StarterSetNotFoundError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong' }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type RetireStarterSetMutationVariables = Exact<{
  input: RetireStarterSetInput;
}>;


export type RetireStarterSetMutation = { retireStarterSet:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'InvalidStarterSetStatusTransitionError' }
    | { __typename: 'RetireStarterSetSuccess', id: string, revision: number }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'StarterSetNotFoundError' }
   };

export type StarterSetQueryVariables = Exact<{
  id: string;
}>;


export type StarterSetQuery = { starterSet:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'StarterSet', id: string, name: string, status: StarterSetStatus, revision: number, registeredAt: string, updatedAt: string, grantDecks: Array<{ id: string, name: string, status: GrantDeckStatus }>, unlockBoards: Array<{ id: string, name: string, status: BoardStatus }>, unlockNpcAvatars: Array<{ id: string, name: string, status: NpcAvatarStatus }> }
    | { __typename: 'StarterSetNotFoundError' }
   };

export type StarterSetCandidateGrantDecksQueryVariables = Exact<{
  filter?: GrantDeckFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type StarterSetCandidateGrantDecksQuery = { grantDecks:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'GrantDeckConnection', edges: Array<{ node: { id: string, name: string } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ValidationErrors' }
   };

export type StarterSetCandidateBoardsQueryVariables = Exact<{
  filter?: BoardFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type StarterSetCandidateBoardsQuery = { boards:
    | { __typename: 'BoardsConnection', edges: Array<{ node: { id: string, name: string } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ForbiddenError' }
    | { __typename: 'ValidationErrors' }
   };

export type StarterSetCandidateNpcAvatarsQueryVariables = Exact<{
  filter?: NpcAvatarFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type StarterSetCandidateNpcAvatarsQuery = { npcAvatars:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'NpcAvatarConnection', edges: Array<{ node: { id: string, name: string } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ValidationErrors' }
   };

export type StarterSetRevisionQueryVariables = Exact<{
  id: string;
}>;


export type StarterSetRevisionQuery = { starterSet:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'StarterSet', revision: number }
    | { __typename: 'StarterSetNotFoundError' }
   };

export type RegisterStarterSetMutationVariables = Exact<{
  input: RegisterStarterSetInput;
}>;


export type RegisterStarterSetMutation = { registerStarterSet:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RegisterStarterSetSuccess', id: string, revision: number }
    | { __typename: 'StarterSetNameAlreadyInUseError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong', max: number }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type SetStarterSetGrantDecksMutationVariables = Exact<{
  input: SetStarterSetGrantDecksInput;
}>;


export type SetStarterSetGrantDecksMutation = { setStarterSetGrantDecks:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'SetStarterSetGrantDecksSuccess', id: string, revision: number }
    | { __typename: 'StarterSetNotDraftError' }
    | { __typename: 'StarterSetNotFoundError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong' }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type SetStarterSetUnlockBoardsMutationVariables = Exact<{
  input: SetStarterSetUnlockBoardsInput;
}>;


export type SetStarterSetUnlockBoardsMutation = { setStarterSetUnlockBoards:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'SetStarterSetUnlockBoardsSuccess', id: string, revision: number }
    | { __typename: 'StarterSetNotDraftError' }
    | { __typename: 'StarterSetNotFoundError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong' }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type SetStarterSetUnlockNpcAvatarsMutationVariables = Exact<{
  input: SetStarterSetUnlockNpcAvatarsInput;
}>;


export type SetStarterSetUnlockNpcAvatarsMutation = { setStarterSetUnlockNpcAvatars:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'RevisionConflictError' }
    | { __typename: 'SetStarterSetUnlockNpcAvatarsSuccess', id: string, revision: number }
    | { __typename: 'StarterSetNotDraftError' }
    | { __typename: 'StarterSetNotFoundError' }
    | { __typename: 'ValidationErrors', errors: Array<
        | { __typename: 'FieldDuplicated' }
        | { __typename: 'FieldInvalidFormat' }
        | { __typename: 'FieldNotAdjacent' }
        | { __typename: 'FieldNotFound' }
        | { __typename: 'FieldNotGreaterThan' }
        | { __typename: 'FieldNotPairable' }
        | { __typename: 'FieldOutOfRange' }
        | { __typename: 'FieldPairKindMismatch' }
        | { __typename: 'FieldPairedWithSelf' }
        | { __typename: 'FieldRequired' }
        | { __typename: 'FieldTooLong' }
        | { __typename: 'FieldTooSmall' }
        | { __typename: 'FieldTotalMismatch' }
        | { __typename: 'FieldTotalTooLarge' }
        | { __typename: 'FieldUnavailable' }
      > }
   };

export type StarterSetsQueryVariables = Exact<{
  filter?: StarterSetFilter | null | undefined;
  after?: string | null | undefined;
}>;


export type StarterSetsQuery = { starterSets:
    | { __typename: 'ForbiddenError' }
    | { __typename: 'StarterSetConnection', edges: Array<{ node: { id: string, name: string, status: StarterSetStatus, registeredAt: string, updatedAt: string, grantDecks: Array<{ id: string, name: string }>, unlockBoards: Array<{ id: string, name: string }>, unlockNpcAvatars: Array<{ id: string, name: string }> } }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }
    | { __typename: 'ValidationErrors' }
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

export const RenameBoardDocument = new TypedDocumentString(`
    mutation RenameBoard($input: RenameBoardInput!) {
  renameBoard(input: $input) {
    __typename
    ... on RenameBoardSuccess {
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
    `) as unknown as TypedDocumentString<RenameBoardMutation, RenameBoardMutationVariables>;
export const ChangeBoardDefaultRulesDocument = new TypedDocumentString(`
    mutation ChangeBoardDefaultRules($input: ChangeBoardDefaultRulesInput!) {
  changeBoardDefaultRules(input: $input) {
    __typename
    ... on ChangeBoardDefaultRulesSuccess {
      id
      revision
    }
    ... on ValidationErrors {
      errors {
        __typename
        field
        ... on FieldTooSmall {
          min
        }
        ... on FieldNotGreaterThan {
          than
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<ChangeBoardDefaultRulesMutation, ChangeBoardDefaultRulesMutationVariables>;
export const CheckBoardLayoutDocument = new TypedDocumentString(`
    query CheckBoardLayout($input: CheckBoardLayoutInput!) {
  checkBoardLayout(input: $input) {
    __typename
    ... on CheckBoardLayoutSuccess {
      publishProblems {
        __typename
        ... on BaseCountProblem {
          positions {
            x
            y
          }
        }
        ... on UnreachableTilesProblem {
          positions {
            x
            y
          }
        }
        ... on UnpairedTilesProblem {
          positions {
            x
            y
          }
        }
      }
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
    `) as unknown as TypedDocumentString<CheckBoardLayoutQuery, CheckBoardLayoutQueryVariables>;
export const DeleteBoardDocument = new TypedDocumentString(`
    mutation DeleteBoard($input: DeleteBoardInput!) {
  deleteBoard(input: $input) {
    __typename
  }
}
    `) as unknown as TypedDocumentString<DeleteBoardMutation, DeleteBoardMutationVariables>;
export const RetireBoardDocument = new TypedDocumentString(`
    mutation RetireBoard($input: RetireBoardInput!) {
  retireBoard(input: $input) {
    __typename
    ... on RetireBoardSuccess {
      id
      revision
    }
  }
}
    `) as unknown as TypedDocumentString<RetireBoardMutation, RetireBoardMutationVariables>;
export const BoardDocument = new TypedDocumentString(`
    query Board($id: UUID!) {
  board(id: $id) {
    __typename
    ... on Board {
      id
      name
      status
      width
      height
      tiles {
        __typename
        x
        y
        ... on LandTile {
          attribute
        }
      }
      defaultRules {
        targetMagic
        startingMagic
        lapBonus
        checkpointBonus
        roundLimit
        diceMin
        diceMax
      }
      publishProblems {
        __typename
        ... on BaseCountProblem {
          positions {
            x
            y
          }
        }
        ... on UnreachableTilesProblem {
          positions {
            x
            y
          }
        }
        ... on UnpairedTilesProblem {
          positions {
            x
            y
          }
        }
      }
      connections {
        a {
          x
          y
        }
        b {
          x
          y
        }
      }
      pairs {
        a {
          x
          y
        }
        b {
          x
          y
        }
      }
      revision
      registeredAt
      updatedAt
    }
  }
  studioRules {
    __typename
    ... on StudioRules {
      board {
        minSize
        maxSize
      }
    }
  }
}
    `) as unknown as TypedDocumentString<BoardQuery, BoardQueryVariables>;
export const BoardRevisionDocument = new TypedDocumentString(`
    query BoardRevision($id: UUID!) {
  board(id: $id) {
    __typename
    ... on Board {
      revision
    }
  }
}
    `) as unknown as TypedDocumentString<BoardRevisionQuery, BoardRevisionQueryVariables>;
export const ChangeBoardLayoutDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<ChangeBoardLayoutMutation, ChangeBoardLayoutMutationVariables>;
export const PublishBoardDocument = new TypedDocumentString(`
    mutation PublishBoard($input: PublishBoardInput!) {
  publishBoard(input: $input) {
    __typename
    ... on PublishBoardSuccess {
      id
      revision
    }
    ... on BoardNotPublishableError {
      problems {
        __typename
        ... on BaseCountProblem {
          positions {
            x
            y
          }
        }
        ... on UnreachableTilesProblem {
          positions {
            x
            y
          }
        }
        ... on UnpairedTilesProblem {
          positions {
            x
            y
          }
        }
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PublishBoardMutation, PublishBoardMutationVariables>;
export const RegisterBoardDocument = new TypedDocumentString(`
    mutation RegisterBoard($input: RegisterBoardInput!) {
  registerBoard(input: $input) {
    __typename
    ... on RegisterBoardSuccess {
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
    `) as unknown as TypedDocumentString<RegisterBoardMutation, RegisterBoardMutationVariables>;
export const BoardsDocument = new TypedDocumentString(`
    query Boards($filter: BoardFilter, $after: String) {
  boards(filter: $filter, after: $after) {
    __typename
    ... on BoardsConnection {
      edges {
        node {
          id
          name
          status
          width
          height
          tileCounts {
            land
            base
            checkpoint
            fire
            earth
            water
            wind
            neutral
            multi
            warp
            bridge
            sanctuary
            shrine
            prophecyShop
            cardShop
          }
          defaultRules {
            targetMagic
            startingMagic
            lapBonus
            checkpointBonus
            roundLimit
            diceMin
            diceMax
          }
          publishProblems {
            __typename
          }
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
    `) as unknown as TypedDocumentString<BoardsQuery, BoardsQueryVariables>;
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
export const RegisterCreatureDocument = new TypedDocumentString(`
    mutation RegisterCreature($input: RegisterCreatureInput!) {
  registerCreature(input: $input) {
    __typename
    ... on RegisterCreatureSuccess {
      creature {
        id
        revision
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
export const RenameGrantDeckDocument = new TypedDocumentString(`
    mutation RenameGrantDeck($input: RenameGrantDeckInput!) {
  renameGrantDeck(input: $input) {
    __typename
    ... on RenameGrantDeckSuccess {
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
    `) as unknown as TypedDocumentString<RenameGrantDeckMutation, RenameGrantDeckMutationVariables>;
export const DeleteGrantDeckDocument = new TypedDocumentString(`
    mutation DeleteGrantDeck($input: DeleteGrantDeckInput!) {
  deleteGrantDeck(input: $input) {
    __typename
  }
}
    `) as unknown as TypedDocumentString<DeleteGrantDeckMutation, DeleteGrantDeckMutationVariables>;
export const RetireGrantDeckDocument = new TypedDocumentString(`
    mutation RetireGrantDeck($input: RetireGrantDeckInput!) {
  retireGrantDeck(input: $input) {
    __typename
    ... on RetireGrantDeckSuccess {
      id
      revision
    }
  }
}
    `) as unknown as TypedDocumentString<RetireGrantDeckMutation, RetireGrantDeckMutationVariables>;
export const GrantDeckDocument = new TypedDocumentString(`
    query GrantDeck($id: UUID!) {
  grantDeck(id: $id) {
    __typename
    ... on GrantDeck {
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
      totalCount
      revision
      registeredAt
      updatedAt
    }
  }
}
    `) as unknown as TypedDocumentString<GrantDeckQuery, GrantDeckQueryVariables>;
export const GrantDeckCandidateCardsDocument = new TypedDocumentString(`
    query GrantDeckCandidateCards($filter: CardFilter, $after: String) {
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
    `) as unknown as TypedDocumentString<GrantDeckCandidateCardsQuery, GrantDeckCandidateCardsQueryVariables>;
export const RegisterGrantDeckFromPresetDeckDocument = new TypedDocumentString(`
    mutation RegisterGrantDeckFromPresetDeck($input: RegisterGrantDeckFromPresetDeckInput!) {
  registerGrantDeckFromPresetDeck(input: $input) {
    __typename
    ... on RegisterGrantDeckFromPresetDeckSuccess {
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
    `) as unknown as TypedDocumentString<RegisterGrantDeckFromPresetDeckMutation, RegisterGrantDeckFromPresetDeckMutationVariables>;
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
export const GrantDeckRevisionDocument = new TypedDocumentString(`
    query GrantDeckRevision($id: UUID!) {
  grantDeck(id: $id) {
    __typename
    ... on GrantDeck {
      revision
    }
  }
}
    `) as unknown as TypedDocumentString<GrantDeckRevisionQuery, GrantDeckRevisionQueryVariables>;
export const RegisterGrantDeckDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<RegisterGrantDeckMutation, RegisterGrantDeckMutationVariables>;
export const SetGrantDeckCardCountsDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<SetGrantDeckCardCountsMutation, SetGrantDeckCardCountsMutationVariables>;
export const PublishGrantDeckDocument = new TypedDocumentString(`
    mutation PublishGrantDeck($input: PublishGrantDeckInput!) {
  publishGrantDeck(input: $input) {
    __typename
    ... on PublishGrantDeckSuccess {
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
    `) as unknown as TypedDocumentString<PublishGrantDeckMutation, PublishGrantDeckMutationVariables>;
export const GrantDecksDocument = new TypedDocumentString(`
    query GrantDecks($filter: GrantDeckFilter, $after: String) {
  grantDecks(filter: $filter, after: $after) {
    __typename
    ... on GrantDeckConnection {
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
    `) as unknown as TypedDocumentString<GrantDecksQuery, GrantDecksQueryVariables>;
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
export const RenameNpcAvatarDocument = new TypedDocumentString(`
    mutation RenameNpcAvatar($input: RenameNpcAvatarInput!) {
  renameNpcAvatar(input: $input) {
    __typename
    ... on RenameNpcAvatarSuccess {
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
    `) as unknown as TypedDocumentString<RenameNpcAvatarMutation, RenameNpcAvatarMutationVariables>;
export const DeleteNpcAvatarDocument = new TypedDocumentString(`
    mutation DeleteNpcAvatar($input: DeleteNpcAvatarInput!) {
  deleteNpcAvatar(input: $input) {
    __typename
  }
}
    `) as unknown as TypedDocumentString<DeleteNpcAvatarMutation, DeleteNpcAvatarMutationVariables>;
export const RetireNpcAvatarDocument = new TypedDocumentString(`
    mutation RetireNpcAvatar($input: RetireNpcAvatarInput!) {
  retireNpcAvatar(input: $input) {
    __typename
    ... on RetireNpcAvatarSuccess {
      id
      revision
    }
  }
}
    `) as unknown as TypedDocumentString<RetireNpcAvatarMutation, RetireNpcAvatarMutationVariables>;
export const NpcAvatarDocument = new TypedDocumentString(`
    query NpcAvatar($id: UUID!) {
  npcAvatar(id: $id) {
    __typename
    ... on NpcAvatar {
      id
      name
      status
      revision
      registeredAt
      updatedAt
      decks {
        id
        name
        status
      }
    }
  }
}
    `) as unknown as TypedDocumentString<NpcAvatarQuery, NpcAvatarQueryVariables>;
export const NpcAvatarCandidateDecksDocument = new TypedDocumentString(`
    query NpcAvatarCandidateDecks($filter: NpcDeckFilter, $after: String) {
  npcDecks(filter: $filter, after: $after) {
    __typename
    ... on NpcDeckConnection {
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
    `) as unknown as TypedDocumentString<NpcAvatarCandidateDecksQuery, NpcAvatarCandidateDecksQueryVariables>;
export const NpcAvatarRevisionDocument = new TypedDocumentString(`
    query NpcAvatarRevision($id: UUID!) {
  npcAvatar(id: $id) {
    __typename
    ... on NpcAvatar {
      revision
    }
  }
}
    `) as unknown as TypedDocumentString<NpcAvatarRevisionQuery, NpcAvatarRevisionQueryVariables>;
export const RegisterNpcAvatarDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<RegisterNpcAvatarMutation, RegisterNpcAvatarMutationVariables>;
export const SetNpcAvatarDecksDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<SetNpcAvatarDecksMutation, SetNpcAvatarDecksMutationVariables>;
export const PublishNpcAvatarDocument = new TypedDocumentString(`
    mutation PublishNpcAvatar($input: PublishNpcAvatarInput!) {
  publishNpcAvatar(input: $input) {
    __typename
    ... on PublishNpcAvatarSuccess {
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
    `) as unknown as TypedDocumentString<PublishNpcAvatarMutation, PublishNpcAvatarMutationVariables>;
export const NpcAvatarsDocument = new TypedDocumentString(`
    query NpcAvatars($filter: NpcAvatarFilter, $after: String) {
  npcAvatars(filter: $filter, after: $after) {
    __typename
    ... on NpcAvatarConnection {
      edges {
        node {
          id
          name
          status
          decks {
            id
            name
          }
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
    `) as unknown as TypedDocumentString<NpcAvatarsQuery, NpcAvatarsQueryVariables>;
export const RenameNpcDeckDocument = new TypedDocumentString(`
    mutation RenameNpcDeck($input: RenameNpcDeckInput!) {
  renameNpcDeck(input: $input) {
    __typename
    ... on RenameNpcDeckSuccess {
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
    `) as unknown as TypedDocumentString<RenameNpcDeckMutation, RenameNpcDeckMutationVariables>;
export const DeleteNpcDeckDocument = new TypedDocumentString(`
    mutation DeleteNpcDeck($input: DeleteNpcDeckInput!) {
  deleteNpcDeck(input: $input) {
    __typename
  }
}
    `) as unknown as TypedDocumentString<DeleteNpcDeckMutation, DeleteNpcDeckMutationVariables>;
export const RetireNpcDeckDocument = new TypedDocumentString(`
    mutation RetireNpcDeck($input: RetireNpcDeckInput!) {
  retireNpcDeck(input: $input) {
    __typename
    ... on RetireNpcDeckSuccess {
      id
      revision
    }
  }
}
    `) as unknown as TypedDocumentString<RetireNpcDeckMutation, RetireNpcDeckMutationVariables>;
export const NpcDeckDocument = new TypedDocumentString(`
    query NpcDeck($id: UUID!) {
  npcDeck(id: $id) {
    __typename
    ... on NpcDeck {
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
      totalCount
      revision
      registeredAt
      updatedAt
    }
  }
}
    `) as unknown as TypedDocumentString<NpcDeckQuery, NpcDeckQueryVariables>;
export const NpcDeckCandidateCardsDocument = new TypedDocumentString(`
    query NpcDeckCandidateCards($filter: CardFilter, $after: String) {
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
    `) as unknown as TypedDocumentString<NpcDeckCandidateCardsQuery, NpcDeckCandidateCardsQueryVariables>;
export const RegisterNpcDeckFromPresetDeckDocument = new TypedDocumentString(`
    mutation RegisterNpcDeckFromPresetDeck($input: RegisterNpcDeckFromPresetDeckInput!) {
  registerNpcDeckFromPresetDeck(input: $input) {
    __typename
    ... on RegisterNpcDeckFromPresetDeckSuccess {
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
    `) as unknown as TypedDocumentString<RegisterNpcDeckFromPresetDeckMutation, RegisterNpcDeckFromPresetDeckMutationVariables>;
export const NpcDeckCopySourcePresetDecksDocument = new TypedDocumentString(`
    query NpcDeckCopySourcePresetDecks($filter: PresetDeckFilter, $after: String) {
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
    `) as unknown as TypedDocumentString<NpcDeckCopySourcePresetDecksQuery, NpcDeckCopySourcePresetDecksQueryVariables>;
export const NpcDeckRevisionDocument = new TypedDocumentString(`
    query NpcDeckRevision($id: UUID!) {
  npcDeck(id: $id) {
    __typename
    ... on NpcDeck {
      revision
    }
  }
}
    `) as unknown as TypedDocumentString<NpcDeckRevisionQuery, NpcDeckRevisionQueryVariables>;
export const RegisterNpcDeckDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<RegisterNpcDeckMutation, RegisterNpcDeckMutationVariables>;
export const SetNpcDeckCardCountsDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<SetNpcDeckCardCountsMutation, SetNpcDeckCardCountsMutationVariables>;
export const PublishNpcDeckDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<PublishNpcDeckMutation, PublishNpcDeckMutationVariables>;
export const NpcDecksDocument = new TypedDocumentString(`
    query NpcDecks($filter: NpcDeckFilter, $after: String) {
  npcDecks(filter: $filter, after: $after) {
    __typename
    ... on NpcDeckConnection {
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
    `) as unknown as TypedDocumentString<NpcDecksQuery, NpcDecksQueryVariables>;
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
export const RenameStarterSetDocument = new TypedDocumentString(`
    mutation RenameStarterSet($input: RenameStarterSetInput!) {
  renameStarterSet(input: $input) {
    __typename
    ... on RenameStarterSetSuccess {
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
    `) as unknown as TypedDocumentString<RenameStarterSetMutation, RenameStarterSetMutationVariables>;
export const DeleteStarterSetDocument = new TypedDocumentString(`
    mutation DeleteStarterSet($input: DeleteStarterSetInput!) {
  deleteStarterSet(input: $input) {
    __typename
  }
}
    `) as unknown as TypedDocumentString<DeleteStarterSetMutation, DeleteStarterSetMutationVariables>;
export const PublishStarterSetDocument = new TypedDocumentString(`
    mutation PublishStarterSet($input: PublishStarterSetInput!) {
  publishStarterSet(input: $input) {
    __typename
    ... on PublishStarterSetSuccess {
      id
      revision
    }
    ... on StarterSetLimitReachedError {
      max
    }
    ... on ValidationErrors {
      errors {
        __typename
      }
    }
  }
}
    `) as unknown as TypedDocumentString<PublishStarterSetMutation, PublishStarterSetMutationVariables>;
export const RetireStarterSetDocument = new TypedDocumentString(`
    mutation RetireStarterSet($input: RetireStarterSetInput!) {
  retireStarterSet(input: $input) {
    __typename
    ... on RetireStarterSetSuccess {
      id
      revision
    }
  }
}
    `) as unknown as TypedDocumentString<RetireStarterSetMutation, RetireStarterSetMutationVariables>;
export const StarterSetDocument = new TypedDocumentString(`
    query StarterSet($id: UUID!) {
  starterSet(id: $id) {
    __typename
    ... on StarterSet {
      id
      name
      status
      revision
      registeredAt
      updatedAt
      grantDecks {
        id
        name
        status
      }
      unlockBoards {
        id
        name
        status
      }
      unlockNpcAvatars {
        id
        name
        status
      }
    }
  }
}
    `) as unknown as TypedDocumentString<StarterSetQuery, StarterSetQueryVariables>;
export const StarterSetCandidateGrantDecksDocument = new TypedDocumentString(`
    query StarterSetCandidateGrantDecks($filter: GrantDeckFilter, $after: String) {
  grantDecks(filter: $filter, after: $after) {
    __typename
    ... on GrantDeckConnection {
      edges {
        node {
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
    `) as unknown as TypedDocumentString<StarterSetCandidateGrantDecksQuery, StarterSetCandidateGrantDecksQueryVariables>;
export const StarterSetCandidateBoardsDocument = new TypedDocumentString(`
    query StarterSetCandidateBoards($filter: BoardFilter, $after: String) {
  boards(filter: $filter, after: $after) {
    __typename
    ... on BoardsConnection {
      edges {
        node {
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
    `) as unknown as TypedDocumentString<StarterSetCandidateBoardsQuery, StarterSetCandidateBoardsQueryVariables>;
export const StarterSetCandidateNpcAvatarsDocument = new TypedDocumentString(`
    query StarterSetCandidateNpcAvatars($filter: NpcAvatarFilter, $after: String) {
  npcAvatars(filter: $filter, after: $after) {
    __typename
    ... on NpcAvatarConnection {
      edges {
        node {
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
    `) as unknown as TypedDocumentString<StarterSetCandidateNpcAvatarsQuery, StarterSetCandidateNpcAvatarsQueryVariables>;
export const StarterSetRevisionDocument = new TypedDocumentString(`
    query StarterSetRevision($id: UUID!) {
  starterSet(id: $id) {
    __typename
    ... on StarterSet {
      revision
    }
  }
}
    `) as unknown as TypedDocumentString<StarterSetRevisionQuery, StarterSetRevisionQueryVariables>;
export const RegisterStarterSetDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<RegisterStarterSetMutation, RegisterStarterSetMutationVariables>;
export const SetStarterSetGrantDecksDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<SetStarterSetGrantDecksMutation, SetStarterSetGrantDecksMutationVariables>;
export const SetStarterSetUnlockBoardsDocument = new TypedDocumentString(`
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
    `) as unknown as TypedDocumentString<SetStarterSetUnlockBoardsMutation, SetStarterSetUnlockBoardsMutationVariables>;
export const SetStarterSetUnlockNpcAvatarsDocument = new TypedDocumentString(`
    mutation SetStarterSetUnlockNpcAvatars($input: SetStarterSetUnlockNpcAvatarsInput!) {
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
    `) as unknown as TypedDocumentString<SetStarterSetUnlockNpcAvatarsMutation, SetStarterSetUnlockNpcAvatarsMutationVariables>;
export const StarterSetsDocument = new TypedDocumentString(`
    query StarterSets($filter: StarterSetFilter, $after: String) {
  starterSets(filter: $filter, after: $after) {
    __typename
    ... on StarterSetConnection {
      edges {
        node {
          id
          name
          status
          grantDecks {
            id
            name
          }
          unlockBoards {
            id
            name
          }
          unlockNpcAvatars {
            id
            name
          }
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
    `) as unknown as TypedDocumentString<StarterSetsQuery, StarterSetsQueryVariables>;