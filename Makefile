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

# 開発ツール

# フォーマットを自動修正する（lint はファイルを書き換えないため、修正はこちらで行う）
.PHONY: fmt
fmt:
	docker compose exec cms pnpm format

# biome check（lint + フォーマット違反の検出。ファイルは書き換えない）と型チェック
.PHONY: lint
lint:
	docker compose exec cms pnpm lint
	docker compose exec cms pnpm typecheck

# テスト

# 専用の core・DB と本番用イメージの cms を使い捨てで起動してテストし、終了後に破棄する（開発用の環境とは独立）
TEST_COMPOSE := docker compose -p cms-test -f compose.test.yaml

.PHONY: test
test:
	$(TEST_COMPOSE) up -d --build --wait && $(TEST_COMPOSE) run --rm --build cms-test-runner; \
	status=$$?; $(TEST_COMPOSE) --profile runner down -v; exit $$status
