from fastapi import APIRouter

from app.api.routes_auth import router as auth_router
from app.api.routes_surf import router as surf_router
from app.api.routes_tasks import router as tasks_router
from app.api.routes_telegram import router as telegram_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(surf_router)
api_router.include_router(tasks_router)
api_router.include_router(telegram_router)
