// core は文言を返さず、理由の型と値だけを返すため、文言はここで作る

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

// スターターデッキを公開できないときの誤り（決まりの値は core が返したものを使う）
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

export const STARTER_DECK_NOT_DRAFT =
  "準備中でないため、変えられません。最新の状態を表示しています";
export function starterDeckLimitReachedMessage(max: number): string {
  return `公開中のスターターデッキは ${max} 個までです。ほかのものを使用不可にすると公開できます`;
}

export const BOARD_NOT_DRAFT =
  "準備中でないため、変えられません。最新の状態を表示しています";

// ボードを公開できないときの誤り（数と座標は core が返したものを使う。座標は core と同じ 0 始まりで、(列, 行) の順に出す）
export function boardPublishErrorMessage(error: {
  baseCount: number;
  checkpointCount: number;
  unreachableTiles: { x: number; y: number }[];
}): string {
  const messages: string[] = [];
  if (error.baseCount === 0) {
    messages.push("拠点が 0 個です。ちょうど 1 つ置いてください");
  } else if (error.baseCount > 1) {
    messages.push(
      `拠点が ${error.baseCount} 個あります。ちょうど 1 つにしてください`,
    );
  }
  if (error.checkpointCount === 0) {
    messages.push("チェックポイントがありません。1 つ以上置いてください");
  }
  if (error.unreachableTiles.length > 0) {
    const positions = error.unreachableTiles
      .map(({ x, y }) => `(${x}, ${y})`)
      .join("・");
    messages.push(
      `拠点から行けないマスがあります: ${positions}（(列, 行) の順。0 から数えます）`,
    );
  }
  return messages.join("。");
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

export const BOARD_LAYOUT_INVALID = "レイアウトの入力が正しくありません";

// ボードの既定のルールの項目の呼び方（core の項目名から）
export const RULE_LABELS = {
  targetMagic: "目標の魔力",
  startingMagic: "開始時の魔力",
  lapBonus: "周回のボーナス",
  checkpointBonus: "チェックポイントのボーナス",
} as const;
export type RuleField = keyof typeof RULE_LABELS;

export function isRuleField(value: string): value is RuleField {
  return Object.hasOwn(RULE_LABELS, value);
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
