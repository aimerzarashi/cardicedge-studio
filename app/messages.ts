// core は文言を返さず、理由の型と値だけを返すため、文言はここで作る

import type { PublishProblem } from "./boards/publish-problem";

export function nameErrorMessage(
  errors: { __typename: string; max?: number }[],
): string {
  return errors
    .map((error) =>
      error.__typename === "FieldTooLong"
        ? `名前は ${error.max} 文字以内で入力してください`
        : "名前を入力してください",
    )
    .join("。");
}

export const NAME_ALREADY_IN_USE =
  "この名前はすでに使われています。全角・半角や大文字・小文字の違いは、同じ名前とみなします";

export const CORE_UNAVAILABLE =
  "core に接続できません。時間をおいてもう一度操作してください";

export const FORBIDDEN = "この操作をする権限がありません";

export const REVISION_CONFLICT =
  "ほかの操作で変わっていたため、変えませんでした。最新の状態を表示しています";
export const NOT_REFLECTED =
  "反映に時間がかかっています。しばらくしてから再読み込みしてください";
export const INVALID_TARGET =
  "画面が古くなっています。再読み込みしてから操作してください";
export const INVALID_STATUS_TRANSITION =
  "今の状態ではこの操作はできません。最新の状態を表示しています";

// 効果の無いスペルは対戦で使えないため、core が公開を断る（core#152）
export const SPELL_EFFECT_REQUIRED =
  "効果の無いスペルは公開できません。カードの詳細で効果を入れてください";

type FieldError = {
  __typename: string;
  field?: string;
  min?: number;
  max?: number;
  required?: number;
};

// 入力の項目に結びつかない誤り（一覧全体への誤り）
export function formErrorMessage(error: FieldError): string {
  switch (error.__typename) {
    case "FieldTotalTooLarge":
      return `枚数の合計は ${error.max} 枚以内にしてください`;
    case "FieldOutOfRange":
      return `一度に変えられるカードは ${error.max} 種類までです`;
    default:
      return "入力が正しくありません";
  }
}

// カードの枚数の入力の行ごとの誤り
export function cardErrorMessage(error: FieldError): string {
  switch (error.__typename) {
    case "FieldOutOfRange":
      return `枚数は ${error.min}〜${error.max} 枚にしてください`;
    case "FieldNotFound":
      return "このカードは見つかりません";
    case "FieldDuplicated":
      return "同じカードが 2 回入っています";
    case "FieldUnavailable":
      return "このカードは公開中でないため、入れられません";
    default:
      return "入力が正しくありません";
  }
}

// 配布デッキ・NPC のデッキを公開できないときの誤り（決まりの値は core が返したものを使う）
export function publishErrorMessage(errors: FieldError[]): string {
  return errors
    .map((error) => {
      switch (error.__typename) {
        case "FieldTotalMismatch":
          return `カードの合計をちょうど ${error.required} 枚にしてから公開してください`;
        case "FieldUnavailable":
          return "公開中でないカードが入っています。カードを公開するか、デッキから外してから公開してください";
        default:
          return "入力が正しくありません";
      }
    })
    .join("。");
}

export const GRANT_DECK_NOT_DRAFT =
  "準備中でないため、変えられません。最新の状態を表示しています";

export const BOARD_NOT_DRAFT =
  "準備中でないため、変えられません。最新の状態を表示しています";

export const BOARD_NOT_PUBLISHABLE = "公開できません。理由を確認してください";

// ボードを公開できない理由（種類は __typename、数は core が返した座標の数）。core の message は開発者向けのため出さない
export function boardPublishProblemMessage(problem: PublishProblem): string {
  switch (problem.__typename) {
    case "BaseCountProblem":
      return problem.positions.length === 0
        ? "拠点がありません。ちょうど 1 つ置いてください"
        : `拠点が ${problem.positions.length} つあります。ちょうど 1 つにしてください`;
    case "NoCheckpointProblem":
      return "チェックポイントがありません。1 つ以上置いてください";
    case "UnreachableTilesProblem":
      return `拠点から行けないマスが ${problem.positions.length} つあります`;
    case "UnpairedTilesProblem":
      return `相手のいない転送円・橋が ${problem.positions.length} つあります。対にするか、消してください`;
  }
}

// ボードのレイアウトを保存できないときの誤り（範囲は core が返したものを使う。座標は (列, 行) の順で、core と同じ 0 始まり）
export function boardSizeErrorMessage(
  label: "幅" | "高さ",
  error: { min?: number; max?: number },
): string {
  return `${label}は ${error.min}〜${error.max} にしてください`;
}

export function boardTileErrorMessage(
  position: { x: number; y: number },
  error: { __typename: string; field: string; min?: number; max?: number },
): string {
  const at = `(${position.x}, ${position.y})`;
  switch (error.__typename) {
    case "FieldOutOfRange": {
      const axis = error.field.endsWith(".x") ? "列" : "行";
      return `${at} のマスが格子の外です。${axis}は ${error.min}〜${error.max} の範囲に置いてください`;
    }
    case "FieldDuplicated":
      return `${at} のマスが重複しています`;
    default:
      return `${at} のマスの入力が正しくありません`;
  }
}

export function boardConnectionErrorMessage(
  connection: { a: { x: number; y: number }; b: { x: number; y: number } },
  error: { __typename: string },
): string {
  const ends = `(${connection.a.x}, ${connection.a.y}) と (${connection.b.x}, ${connection.b.y}) のつながり`;
  switch (error.__typename) {
    case "FieldNotFound":
      return `${ends}の端にマスがありません`;
    case "FieldNotAdjacent":
      return `${ends}は、上下左右に隣り合うマスどうしではありません`;
    case "FieldDuplicated":
      return `${ends}が重複しています`;
    default:
      return `${ends}の入力が正しくありません`;
  }
}

// 画面は対の端を転送円・橋のマスから作るため、起こるのは画面とのずれがあったときだけ
export function boardPairErrorMessage(
  pair: { a: { x: number; y: number }; b: { x: number; y: number } },
  error: { __typename: string },
): string {
  const ends = `(${pair.a.x}, ${pair.a.y}) と (${pair.b.x}, ${pair.b.y}) の対`;
  switch (error.__typename) {
    case "FieldNotFound":
      return `${ends}の端にマスがありません`;
    case "FieldNotPairable":
      return `${ends}の端が、転送円でも橋でもありません`;
    case "FieldPairKindMismatch":
      return `${ends}が、転送円と橋の組み合わせです。同じ種類どうしにしてください`;
    case "FieldPairedWithSelf":
      return `${ends}が、同じマスどうしです`;
    case "FieldDuplicated":
      return `${ends}が重複しています（同じマスは 1 つの対にだけ入れられます）`;
    default:
      return `${ends}の入力が正しくありません`;
  }
}

export const NPC_AVATAR_NOT_DRAFT =
  "準備中でないため、変えられません。最新の状態を表示しています";

// NPC のアバターに使うデッキを割り当てられないときの誤り（項目は deckIds.<番号>。画面は 1 つずつ足し引きするため、番号は出さない）
export function npcAvatarDeckErrorMessage(
  errors: { __typename: string }[],
): string {
  return errors
    .map((error) => {
      switch (error.__typename) {
        case "FieldDuplicated":
          return "同じデッキが 2 回入っています";
        case "FieldNotFound":
          return "このデッキは見つかりません";
        case "FieldUnavailable":
          return "公開中でないデッキは割り当てられません";
        default:
          return "入力が正しくありません";
      }
    })
    .join("。");
}

// NPC のアバターを公開できないときの誤り（項目は decks。使うデッキが無い・公開中のものが無い）
export function npcAvatarPublishErrorMessage(
  errors: { __typename: string }[],
): string {
  return errors
    .map((error) => {
      switch (error.__typename) {
        case "FieldRequired":
          return "使うデッキを割り当ててから公開してください";
        case "FieldUnavailable":
          return "使うデッキに公開中のものがありません。公開中のデッキを割り当ててから公開してください";
        default:
          return "入力が正しくありません";
      }
    })
    .join("。");
}

export const STARTER_SET_NOT_DRAFT =
  "準備中でないため、変えられません。最新の状態を表示しています";

// スターターセットに配るデッキ・解放するボード・解放する NPC を指定できないときの誤り（項目は <項目名>.<番号>。画面は 1 つずつ足し引きするため、番号は出さない）。
// what は指定するものの呼び方（「デッキ」など）
export function starterSetItemErrorMessage(
  errors: { __typename: string }[],
  what: string,
): string {
  // 呼び方が英字（NPC）のときは、前後に空白を入れる（日本語と英字の間に空白を入れる書き方にそろえる）
  const name = /^[A-Za-z]/.test(what) ? ` ${what} ` : what;
  return errors
    .map((error) => {
      switch (error.__typename) {
        case "FieldDuplicated":
          return `同じ${name}が 2 回入っています`;
        case "FieldNotFound":
          return `この${name}は見つかりません`;
        case "FieldUnavailable":
          return `公開中でない${name}は割り当てられません`;
        default:
          return "入力が正しくありません";
      }
    })
    .join("。");
}

// スターターセットを公開できないときの誤り（項目は grantDecks。配るデッキが無い）
export function starterSetPublishErrorMessage(
  errors: { __typename: string }[],
): string {
  return errors
    .map((error) => {
      switch (error.__typename) {
        case "FieldRequired":
          return "配るデッキを割り当ててから公開してください";
        default:
          return "入力が正しくありません";
      }
    })
    .join("。");
}

// 上限は core が返した値を使う（決まりの値を studio に書き写さない）
export function starterSetLimitReachedMessage(max: number): string {
  return `公開中のスターターセットは ${max} 個までです。今のものを使用不可にすると公開できます`;
}

export const NPC_DECK_NOT_DRAFT =
  "準備中でないため、変えられません。最新の状態を表示しています";

export const BOARD_CHECK_FAILED =
  "公開できない理由を確かめられませんでした。一覧と印は直前のものです";

export const BOARD_LAYOUT_INVALID = "レイアウトの入力が正しくありません";

// ボードの既定のルールの項目の呼び方（core の項目名から）
export const RULE_LABELS = {
  targetMagic: "目標の魔力",
  startingMagic: "開始時の魔力",
  lapBonus: "周回のボーナス",
  checkpointBonus: "チェックポイントのボーナス",
  roundLimit: "ラウンドの上限",
  diceMin: "サイコロの目（最小）",
  diceMax: "サイコロの目（最大）",
  baseLandValue: "土地の基本の値",
} as const;
export type RuleField = keyof typeof RULE_LABELS;

export function isRuleField(value: string): value is RuleField {
  return Object.hasOwn(RULE_LABELS, value);
}

// 魔力の 100 刻みは入力のしやすさのための表示の都合の値で、core の決まりではない（拡大の上限・下限と同じ扱い）。魔力でない項目は 1 刻み
export function ruleStep(field: RuleField): number {
  switch (field) {
    case "roundLimit":
    case "diceMin":
    case "diceMax":
    case "baseLandValue":
      return 1;
    default:
      return 100;
  }
}

function ruleLabel(field: string): string {
  return isRuleField(field) ? RULE_LABELS[field] : field;
}

// 下限・比べる相手は core が返した値を使う（決まりの値を studio に書き写さない）
export function boardRuleErrorMessage(error: {
  __typename: string;
  field: string;
  min?: number;
  than?: string;
}): string {
  const label = ruleLabel(error.field);
  switch (error.__typename) {
    case "FieldTooSmall":
      return `${label}は ${error.min} 以上にしてください`;
    case "FieldNotGreaterThan":
      return `${label}は${ruleLabel(error.than ?? "")}より大きくしてください`;
    default:
      return `${label}の入力が正しくありません`;
  }
}

export const CARD_NOT_DRAFT =
  "公開中・使用不可のカードの性能は変えられません（変えられるのは準備中だけです）";

// コストの入力の誤り（下限は core が返した値を使う）
export function costErrorMessage(error: FieldError): string {
  switch (error.__typename) {
    case "FieldTooSmall":
      return `コストは ${error.min} 以上にしてください`;
    default:
      return "コストが正しくありません";
  }
}

// 先制と後手は同時に持てない（core が断る。core#158）
export const ABILITIES_CONFLICTED = "先制と後手は同時に選べません";

// 属性の入力の誤り（組み合わせの決まりは core が判定し、ここには書き写さない）
export function elementsErrorMessage(error: FieldError): string {
  switch (error.__typename) {
    case "FieldRequired":
      return "属性を 1 つ以上選んでください";
    default:
      return "この属性の組み合わせにはできません";
  }
}

// 性能の数の項目の呼び方（core が返した field で見分ける）
const STAT_FIELD_LABELS: Record<string, string> = {
  hitPoints: "HP",
  "abilities.percent": "通行料の倍率",
  "abilities.minimum": "最小",
  "abilities.maximum": "最大",
  "effect.drawCards.count": "引く枚数",
  "effect.gainMagic.perLap": "周回数 1 つあたりの魔力",
  "effect.rollDice.count": "サイコロの個数",
  "effect.fixedDiceCurse.value": "決める目",
  "effect.fixedDiceCurse.turns": "解けるまでのターン数",
  "effect.damage.amount": "ダメージ",
};

// 攻撃力・体力・スペルの引く枚数の入力の誤り（項目は core が返した field で見分け、下限は core が返した値を使う）
export function statsErrorMessage(error: FieldError): string {
  const label = STAT_FIELD_LABELS[error.field ?? ""] ?? "AT";
  switch (error.__typename) {
    case "FieldTooSmall":
      return `${label}は ${error.min} 以上にしてください`;
    default:
      return `${label}が正しくありません`;
  }
}

// core が返したスペルの効果（種類は __typename。効果なしは null）
export type SpellEffectView =
  | {
      __typename?: string;
      count?: number;
      perLap?: number;
      value?: number;
      turns?: number;
      amount?: number;
    }
  | null
  | undefined;

// スペルの効果の種類（フォームの選択肢の値・呼び方・値の呼び方と、core の入力の項目と出力の型の名前の対応）
export const SPELL_EFFECT_KINDS = [
  {
    kind: "drawCards",
    label: "カードを引く",
    valueLabel: "引く枚数",
    field: "effect.drawCards.count",
    typename: "SpellDrawCardsEffect",
  },
  {
    kind: "gainMagic",
    label: "魔力を得る",
    valueLabel: "周回数 1 つあたりの魔力",
    field: "effect.gainMagic.perLap",
    typename: "SpellGainMagicEffect",
  },
  {
    kind: "rollDice",
    label: "サイコロを複数振る",
    valueLabel: "サイコロの個数",
    field: "effect.rollDice.count",
    typename: "SpellRollDiceEffect",
  },
  {
    kind: "fixedDiceCurse",
    label: "次のサイコロの目を決める呪い",
    valueLabel: "決める目",
    field: "effect.fixedDiceCurse.value",
    typename: "SpellFixedDiceCurseEffect",
  },
  {
    kind: "damage",
    label: "クリーチャーにダメージ",
    valueLabel: "ダメージ",
    field: "effect.damage.amount",
    typename: "SpellDamageEffect",
  },
] as const;

// 呪いの種類だけが持つ、解けるまでのターン数の項目（core の入力の項目）
export const CURSE_TURNS_FIELD = "effect.fixedDiceCurse.turns";

export type SpellEffectKind = (typeof SPELL_EFFECT_KINDS)[number]["kind"];

// フォームに入れる今の効果の種類と値（効果なしは kind が none で値は null。ターン数は呪いだけ）
export function spellEffectValue(effect: SpellEffectView): {
  kind: SpellEffectKind | "none";
  value: number | null;
  turns: number | null;
} {
  const found = SPELL_EFFECT_KINDS.find(
    (entry) => entry.typename === effect?.__typename,
  );
  if (!found || !effect) {
    return { kind: "none", value: null, turns: null };
  }
  const value =
    found.kind === "gainMagic"
      ? effect.perLap
      : found.kind === "fixedDiceCurse"
        ? effect.value
        : found.kind === "damage"
          ? effect.amount
          : effect.count;
  return {
    kind: found.kind,
    value: value ?? null,
    turns: found.kind === "fixedDiceCurse" ? (effect.turns ?? null) : null,
  };
}

// スペルの効果の表示。種類は core が返した __typename で見分け、効果なし（null）は「なし」
export function spellEffectLabel(effect: SpellEffectView): string {
  switch (effect?.__typename) {
    case "SpellDrawCardsEffect":
      return `カードを ${effect.count} 枚引く`;
    case "SpellGainMagicEffect":
      return `（周回数 + 1）× ${effect.perLap} の魔力を得る`;
    case "SpellRollDiceEffect":
      return `サイコロを ${effect.count} 個同時に振る`;
    case "SpellFixedDiceCurseEffect":
      return `対象の次のサイコロの目を ${effect.value} にする呪い（${effect.turns} ターン）`;
    case "SpellDamageEffect":
      return `対象のクリーチャーに ${effect.amount} ダメージ`;
    default:
      return "なし";
  }
}
