.PHONY: help install install-backend install-frontend dev backend frontend test typecheck clean

help:
	@echo "CLI_AL — local dev targets"
	@echo "  make install        # install backend (pip) + frontend (npm)"
	@echo "  make dev            # run backend + frontend together (needs 'make' that supports -j)"
	@echo "  make backend        # run FastAPI on :8000"
	@echo "  make frontend       # run Next.js on :3000"
	@echo "  make test           # run pytest in backend/"
	@echo "  make typecheck      # mypy backend + tsc --noEmit frontend"
	@echo "  make clean          # remove caches"

install: install-backend install-frontend

install-backend:
	cd ../backend && python -m pip install -e ".[dev]"

install-frontend:
	cd ../frontend && npm install

backend:
	cd ../backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

frontend:
	cd ../frontend && npm run dev

# `make -j2 dev` runs both targets in parallel.
dev: backend frontend

test:
	cd ../backend && pytest -q

typecheck:
	cd ../backend && mypy app
	cd ../frontend && npm run typecheck

clean:
	cd ../backend && rm -rf .pytest_cache .mypy_cache .ruff_cache __pycache__ */__pycache__ */*/__pycache__
	cd ../frontend && rm -rf .next node_modules/.cache
