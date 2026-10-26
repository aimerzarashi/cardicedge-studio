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
