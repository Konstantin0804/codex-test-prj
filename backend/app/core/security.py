import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt


def hash_password(password: str) -> str:
    iterations = 120000
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${digest.hex()}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        scheme, iterations_str, salt, digest_hex = password_hash.split("$", 3)
    except ValueError:
        return False

    if scheme != "pbkdf2_sha256":
        return False

    iterations = int(iterations_str)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return hmac.compare_digest(digest.hex(), digest_hex)


def create_access_token(subject: str, secret_key: str, algorithm: str, expires_minutes: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expires_minutes)).timestamp()),
    }
    return jwt.encode(payload, secret_key, algorithm=algorithm)


def decode_access_token(token: str, secret_key: str, algorithm: str) -> dict:
    return jwt.decode(token, secret_key, algorithms=[algorithm])


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48).replace("-", "").replace("_", "")


def hash_refresh_token(token: str, secret_key: str) -> str:
    digest = hashlib.sha256(f"{token}:{secret_key}".encode("utf-8")).hexdigest()
    return digest
