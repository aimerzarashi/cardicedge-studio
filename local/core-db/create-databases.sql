-- make test の core-db の初期化（データディレクトリが空のときに 1 回だけ動く）。core_studio は POSTGRES_DB で作るため、
-- もう 1 つの core_game をここで作る（core#33）。core の同じファイルを使わないのは、../core のブランチしだいで中身が変わるため（studio#14）
CREATE DATABASE core_game;
