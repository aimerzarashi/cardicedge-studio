"use client";

// 想定外の誤り（バグ等）だけがここに来る。想定内の誤り（入力の誤り・権限なし・core に届かない）は、各画面が結果として表示する。
// 本番では Server Component の誤りの message は一般的な文言に置き換わるため、ログと突き合わせる識別子（digest）を出す
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main>
      <h1>問題が発生しました</h1>
      {error.digest && <p>識別子: {error.digest}</p>}
      <button type="button" onClick={() => retry()}>
        もう一度試す
      </button>
    </main>
  );
}
