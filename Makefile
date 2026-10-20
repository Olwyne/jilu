.PHONY: up down logs ci

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f web

ci:
	pnpm run lint
	pnpm test
	pnpm audit --prod
