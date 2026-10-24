/**
 * データを取れなかったときの表示。
 *
 * 訪問者に見せるのは、一時的な不具合だという説明だけ。
 * エラーの中身（DBの接続先やSQLの文など）は外から見えてはいけないので出さない。
 */
export function ErrorBox({ error }: { error?: string }) {
  void error;
  return (
    <div className="notice">
      <h3>データを取得できませんでした</h3>
      <p style={{ margin: 0 }}>
        一時的に表示できない状態です。しばらくしてから、もう一度お試しください。
      </p>
    </div>
  );
}
