.PHONY: build validate preview docker-build up down

build:
	python scripts/build_frontend.py

validate: build
	python scripts/validate_project.py

preview: validate
	python -m http.server 4173 --directory dist

docker-build: validate
	docker compose build

up:
	docker compose up --build -d

down:
	docker compose down
