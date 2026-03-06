.PHONY: up up-neon down restart logs ps

up:
	docker compose --profile localdb down --remove-orphans --rmi local || true
	docker image prune -f
	docker compose --profile localdb up --build -d

up-neon:
	@if ! grep -Eq '^DATABASE_URL=' .env 2>/dev/null; then echo "Set DATABASE_URL in .env (Neon connection string)"; exit 1; fi
	docker compose --profile localdb down --remove-orphans --rmi local || true
	docker image prune -f
	docker compose up --build -d backend frontend

down:
	docker compose --profile localdb down --remove-orphans --rmi local
	docker image prune -f

restart: down up

logs:
	docker compose logs -f --tail=200

ps:
	docker compose ps
