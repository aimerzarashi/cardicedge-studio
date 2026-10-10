// マイグレーション用イメージの Atlas の設定。DB の接続先は実行時に環境変数 DATABASE_URL で渡す（イメージに入れない）
env "deploy" {
  url = getenv("DATABASE_URL")
  migration {
    dir = "file:///migrations"
  }
}
