# Pulseboard

Демо fullstack-проект: **React + TypeScript + Redux Toolkit** + **FastAPI + PostgreSQL**.

## Что реализовано

- Kanban по задачам (`backlog`, `in_progress`, `done`)
- Регистрация/логин пользователя (JWT bearer token)
- Telegram-подтверждение регистрации через бота
- Загрузка фото по итогам каталки (Cloudflare R2)
- Изоляция данных по пользователям (каждый видит только свои задачи)
- Создание, удаление, смена статуса задач
- KPI-метрики на главной (total, in-progress, done, completion)
- API с валидацией схем Pydantic
- SQLAlchemy-модель + Alembic-миграция
- Docker Compose для запуска всей системы
- Seed-данные для красивого первого запуска
- GitHub Actions CI (backend tests + frontend build)
- `render.yaml` для деплоя на Render
- Готовый сценарий деплоя `Render (backend) + Cloudflare Pages (frontend) + Neon (db)`

## Локальный запуск

```bash
cp .env.example .env
make up
```

После старта:

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- API docs: http://localhost:8000/docs

Остановка с очисткой контейнеров и локальных образов проекта:

```bash
make down
```

Полезные команды:

```bash
make ps
make logs
make restart
```

Первый вход в приложение:

- Открой `http://localhost:5173`
- Зарегистрируй нового пользователя (или зайди под существующим)
- После логина токен сохраняется в `localStorage`

## Запуск с Neon (cloud Postgres)

1. Создай базу в Neon и получи connection string.
2. В терминале:

```bash
cp .env.neon.example .env
# вставь свой DATABASE_URL (sslmode=require)
make up-neon
```

В этом режиме локальный контейнер Postgres не запускается, backend работает напрямую с Neon.

## Структура

- `frontend/` — интерфейс на React + Redux Toolkit
- `backend/` — FastAPI + SQLAlchemy + Alembic
- `docker-compose.yml` — оркестрация локально
- `render.yaml` — деплой в Render
- `DEPLOYMENT.md` — пошаговый прод-деплой (Render + Cloudflare + Neon)

## API

- `GET /health`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/telegram/webhook`
- `GET /api/v1/tasks`
- `POST /api/v1/tasks`
- `PATCH /api/v1/tasks/{id}/status`
- `DELETE /api/v1/tasks/{id}`
- `GET /api/v1/tasks/stats`

Все эндпоинты `/api/v1/tasks/*` требуют заголовок:

```text
Authorization: Bearer <access_token>
```

## Seed (опционально)

Автосид при старте отключен, чтобы не перетирать данные.
Если нужно вручную наполнить демо-данными:

```bash
docker compose exec backend python scripts/seed.py
```

Скрипт создаёт пользователя:
- username: `demo`
- password: `demo12345`

## Telegram verification

При регистрации пользователь должен указать Telegram username (например `@Slepchenko_Konstantin`).
Логин будет доступен только после подтверждения в боте.

Переменные окружения backend:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_WEBHOOK_SECRET` (опционально, но рекомендуется)
- `PUBLIC_WEB_URL` (URL фронтенда, для invite ссылок в Telegram)

Webhook endpoint:

`POST /api/v1/telegram/webhook`

## Бесплатный деплой (рекомендуемый)

- **Backend**: Render Web Service (Docker)
- **Frontend**: Cloudflare Pages
- **Database**: Neon Postgres

Подробная инструкция: [`DEPLOYMENT.md`](./DEPLOYMENT.md)

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

- Drag-and-drop колонок
- Фильтрация/поиск/пагинация
- E2E тесты (Playwright)
- Метрики времени по sprint velocity
