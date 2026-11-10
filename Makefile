# Tout tourne dans Docker : rien à installer sur la machine à part Docker.
.PHONY: up down logs reset ci

up:
	docker compose up -d --build --renew-anon-volumes
	@echo "Site : http://localhost:5173 · Émulateurs : http://localhost:4000"

down:
	docker compose down

logs:
	docker compose logs -f

# Repart d'émulateurs vides (efface les comptes et données locales)
reset:
	docker compose down -v

ci:
	docker compose run --rm --no-deps --build web sh -c "pnpm run lint && pnpm test && pnpm run test:rules && pnpm run build && pnpm audit --prod --audit-level high"
