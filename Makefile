.PHONY: up down logs ci

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f web

ci:
	npm run lint
	npm test
	npm audit
