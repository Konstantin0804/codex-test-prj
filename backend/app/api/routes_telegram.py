from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_dep
from app.core.config import get_settings
from app.services.telegram_service import process_update

settings = get_settings()
router = APIRouter(prefix="/telegram", tags=["telegram"])


@router.post("/webhook")
def telegram_webhook(
    payload: dict,
    db: Session = Depends(get_db_dep),
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
) -> dict[str, bool]:
    if settings.telegram_webhook_secret:
        if x_telegram_bot_api_secret_token != settings.telegram_webhook_secret:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook secret")

    process_update(db, payload)
    return {"ok": True}
