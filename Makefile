# 環境管理

# core（共有ネットワークの作成を含む）を起動してから cms を起動する。core が起動済みならそのまま使う
.PHONY: up
up:
	$(MAKE) -C ../core up
	docker compose up -d --build --wait

# オプション: Cloudflare Quick Tunnel を起動し、外部公開用の URL を表示する
.PHONY: tunnel
tunnel:
	docker compose --profile tunnel up -d --build --wait
	@$(MAKE) --no-print-directory url

# 起動中の Quick Tunnel の URL を cloudflared のログから取り出して表示する（起動直後は最大30秒待つ）
.PHONY: url
url:
	@if [ -z "$$(docker compose --profile tunnel ps -q --status running cms-tunnel 2>/dev/null)" ]; then \
		echo "tunnel is not running. run 'make tunnel' first" >&2; exit 1; \
	fi
	@for i in $$(seq 1 30); do \
		url=$$(docker compose logs cms-tunnel 2>/dev/null | grep -o 'https://[a-zA-Z0-9-]*\.trycloudflare\.com' | tail -n 1); \
		if [ -n "$$url" ]; then echo "$$url"; exit 0; fi; \
		sleep 1; \
	done; \
	echo "tunnel URL not found within 30s. see: docker compose logs cms-tunnel" >&2; exit 1

# tunnel を含む cms の全サービスを停止する（core は game も使うため止めない）。pnpm のキャッシュ用ボリュームは残す（消すときは down -v）
.PHONY: down
down:
	docker compose --profile '*' down

# マイグレーション

# 未適用のマイグレーションだけを Atlas で適用する（DB を作り直さずに、追加した migrations を反映する）
.PHONY: migrate
migrate:
	docker compose run --rm cms-migrate

# migrations/ のファイルを足したら実行し、atlas.sum を作り直す（SQL と一緒にコミットする）
.PHONY: migrate-hash
migrate-hash:
	docker compose run --rm --no-deps --user $$(id -u):$$(id -g) cms-migrate migrate hash --dir file:///migrations

# better-auth の設定（lib/auth.ts）と開発用 DB の差分 SQL を次の番号で生成する（例: make migrate-generate NAME=add_two_factor）。
# 先に migrate で DB を最新にしてから差分をとる。差分が無ければファイルは作られない
.PHONY: migrate-generate
migrate-generate:
	@[ -n "$(NAME)" ] || { echo "NAME=<name> を指定する（例: make migrate-generate NAME=add_two_factor）" >&2; exit 1; }
	$(MAKE) migrate
	@last=$$(ls migrations | grep -E '^[0-9]{4}_' | cut -d_ -f1 | sort | tail -n1); \
	next=$$(printf '%04d' $$(($$(expr "$${last:-0}" + 0) + 1))) && \
	file=migrations/$${next}_$(NAME).sql && \
	docker compose exec cms pnpm db:generate $$file && \
	if [ -f $$file ]; then $(MAKE) migrate-hash; else echo "差分が無いためファイルは作っていない"; fi

# 開発ツール

# フォーマットを自動修正する（lint はファイルを書き換えないため、修正はこちらで行う）
.PHONY: fmt
fmt:
	docker compose exec cms pnpm format

# biome check（lint + フォーマット違反の検出。ファイルは書き換えない）、型チェック、migrations の検査（origin/main との分岐点からの変更も見る）、
# better-auth の設定と開発用 DB の差分の検査（新しい migrations は先に make migrate で適用しておく）
.PHONY: lint
lint:
	docker compose exec cms pnpm lint
	docker compose exec cms pnpm typecheck
	scripts/check-migrations.sh $$(git merge-base origin/main HEAD)
	docker compose exec cms scripts/check-auth-schema.sh

# テスト

# 専用の core・DB と本番用イメージの cms を使い捨てで起動してテストし、終了後に破棄する（開発用の環境とは独立）
TEST_COMPOSE := docker compose -p cms-test -f compose.test.yaml

.PHONY: test
test:
	$(TEST_COMPOSE) up -d --build --wait && $(TEST_COMPOSE) run --rm --build cms-test-runner; \
	status=$$?; $(TEST_COMPOSE) --profile runner down -v; exit $$status
