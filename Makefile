.PHONY: help install dev backend frontend worker redis test lint fmt migrate clean bootstrap hooks

help:
	@echo "AthenaK-Frontend dev commands"
	@echo "  make install    — install backend + frontend deps"
	@echo "  make bootstrap  — clone upstream AthenaK into \$$ATHENAK_CACHE_DIR"
	@echo "  make dev        — redis + backend + celery + frontend (reload)"
	@echo "  make backend    — uvicorn --reload"
	@echo "  make frontend   — vite"
	@echo "  make worker     — celery worker"
	@echo "  make redis      — docker-compose up redis"
	@echo "  make migrate    — alembic upgrade head"
	@echo "  make test       — pytest + vitest + tsc"
	@echo "  make lint       — ruff + eslint"
	@echo "  make fmt        — ruff format + prettier"
	@echo "  make clean      — drop build artefacts (keeps upstream AthenaK cache)"

install:
	cd backend && python -m pip install -e '.[dev]'
	cd frontend && pnpm install

bootstrap:
	./scripts/bootstrap_athenak.sh

redis:
	docker-compose up -d redis

backend:
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

worker:
	cd backend && celery -A app.workers.celery_app.celery worker --loglevel=info

frontend:
	cd frontend && pnpm dev

# Minimal orchestration without a process manager; runs services in parallel
# and exits them together on Ctrl-C. Swap for honcho/overmind if you prefer.
dev: redis
	@trap 'kill 0' INT TERM; \
	$(MAKE) backend & \
	$(MAKE) worker & \
	$(MAKE) frontend & \
	wait

migrate:
	cd backend && alembic upgrade head

test:
	cd backend && pytest -q
	cd frontend && pnpm test -- --run
	cd frontend && pnpm tsc --noEmit

lint:
	cd backend && ruff check .
	cd frontend && pnpm lint

fmt:
	cd backend && ruff format .
	cd frontend && pnpm format

clean:
	rm -rf backend/.pytest_cache backend/.ruff_cache backend/athenak.db
	rm -rf frontend/dist frontend/.vite frontend/coverage

hooks:
	pipx run pre-commit install
