# Pulseboard

Демо fullstack-проект: **React + TypeScript + Redux Toolkit** + **FastAPI + PostgreSQL**.

## Что реализовано

- Kanban по задачам (`backlog`, `in_progress`, `done`)
- Создание, удаление, смена статуса задач
- KPI-метрики на главной (total, in-progress, done, completion)
- API с валидацией схем Pydantic
- SQLAlchemy-модель + Alembic-миграция
- Docker Compose для запуска всей системы
- Seed-данные для красивого первого запуска
- GitHub Actions CI (backend tests + frontend build)
- `render.yaml` для деплоя на Render

## Локальный запуск

```bash
cp .env.example .env
docker compose up --build
```

После старта:

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API docs: http://localhost:8000/docs

## Структура

- `frontend/` — интерфейс на React + Redux Toolkit
- `backend/` — FastAPI + SQLAlchemy + Alembic
- `docker-compose.yml` — оркестрация локально
- `render.yaml` — деплой в Render

## API

- `GET /health`
- `GET /api/v1/tasks`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/{id}/status`
- `DELETE /api/v1/tasks/{id}`
- `GET /api/v1/tasks/stats`

## Бесплатный деплой (варианты)

1. **Render (весь стек)**
   - Используй Blueprint из `render.yaml`
   - Сервисы: Postgres (free), backend web (free), static frontend (free)

2. **Vercel + Render + Neon/Supabase**
   - Frontend: Vercel
   - Backend: Render web service
   - DB: Neon или Supabase Postgres free tier

## Публикация в GitHub

```bash
git init
git add .
git commit -m "feat: bootstrap pulseboard fullstack demo"
```

Дальше либо через `gh`, либо через personal access token:

```bash
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

## Что можно добавить дальше

- Авторизация (JWT, refresh tokens)
- Drag-and-drop колонок
- Фильтрация/поиск/пагинация
- E2E тесты (Playwright)
- Метрики времени по sprint velocity
