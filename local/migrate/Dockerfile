# マイグレーション用イメージ。Atlas Community Edition と migrations/ だけを持つ。
# アプリより先にジョブとして実行し、未適用のマイグレーションだけを適用する（何度・同時に実行しても安全）
#   docker run -e DATABASE_URL=postgres://... diecardomain/cms-migrate:<タグ>
# Atlas のバージョンは core / game のマイグレーション用イメージと揃える
FROM arigaio/atlas:1.3.3-community

COPY local/migrate/atlas.hcl /atlas.hcl
COPY migrations /migrations

ENTRYPOINT ["/atlas"]
CMD ["migrate", "apply", "--config", "file:///atlas.hcl", "--env", "deploy"]
