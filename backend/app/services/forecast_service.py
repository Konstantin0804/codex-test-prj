from __future__ import annotations

from datetime import date, datetime, time, timezone

import httpx
from fastapi import HTTPException

from app.core.surf_spots import SURF_SPOT_COORDS

OPEN_METEO_MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
OPEN_METEO_WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

_CACHE_TTL_SECONDS = 20 * 60
_cache: dict[str, tuple[datetime, dict]] = {}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _cache_key(spot_name: str, session_date: date, meeting_time: time | None) -> str:
    hhmm = f"{meeting_time.hour:02d}:{meeting_time.minute:02d}" if meeting_time else "06:00"
    return f"{spot_name}|{session_date.isoformat()}|{hhmm}"


def _closest_index(times: list[str], target_time: time) -> int:
    target_minutes = target_time.hour * 60 + target_time.minute
    best_idx = 0
    best_diff = 24 * 60
    for idx, value in enumerate(times):
        hour = int(value[11:13])
        minute = int(value[14:16])
        current = hour * 60 + minute
        diff = abs(current - target_minutes)
        if diff < best_diff:
            best_diff = diff
            best_idx = idx
    return best_idx


def _nearest_non_null(values: list[float | None], preferred_idx: int) -> float | None:
    if not values:
        return None
    if 0 <= preferred_idx < len(values) and isinstance(values[preferred_idx], (int, float)):
        return values[preferred_idx]
    for radius in range(1, max(len(values), 1)):
        left = preferred_idx - radius
        right = preferred_idx + radius
        if left >= 0 and isinstance(values[left], (int, float)):
            return values[left]
        if right < len(values) and isinstance(values[right], (int, float)):
            return values[right]
    return None


def _cardinal_direction(deg: float | None) -> str:
    if deg is None:
        return "N/A"
    directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    idx = round((deg % 360) / 45) % 8
    return directions[idx]


def _tide_band(value: float | None, min_value: float | None, max_value: float | None) -> str:
    if value is None or min_value is None or max_value is None or max_value - min_value < 1e-6:
        return "mid"
    ratio = (value - min_value) / (max_value - min_value)
    if ratio <= 0.33:
        return "low"
    if ratio >= 0.66:
        return "high"
    return "mid"


def _tide_trend(prev_value: float | None, current_value: float | None, next_value: float | None) -> str:
    if prev_value is None or current_value is None or next_value is None:
        return "stable"
    slope = (next_value - prev_value) / 2
    if slope > 0.02:
        return "rising"
    if slope < -0.02:
        return "falling"
    return "stable"


def _get_with_retry(client: httpx.Client, url: str, params: dict, attempts: int = 2) -> httpx.Response:
    last_error: Exception | None = None
    for _ in range(max(attempts, 1)):
        try:
            response = client.get(url, params=params, headers={"User-Agent": "surfcrew-planner/1.0"})
            response.raise_for_status()
            return response
        except Exception as exc:
            last_error = exc
            continue
    raise last_error or RuntimeError("Upstream request failed")


def get_open_meteo_forecast(
    *,
    spot_name: str,
    session_date: date,
    meeting_time: time | None = None,
) -> dict:
    if spot_name not in SURF_SPOT_COORDS:
        raise HTTPException(status_code=404, detail="Unknown surf spot")

    key = _cache_key(spot_name, session_date, meeting_time)
    cached = _cache.get(key)
    if cached and (_now_utc() - cached[0]).total_seconds() < _CACHE_TTL_SECONDS:
        return cached[1]

    latitude, longitude = SURF_SPOT_COORDS[spot_name]
    target_time = meeting_time or time(6, 0)
    date_str = session_date.isoformat()

    marine_params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": ",".join(
            [
                "wave_height",
                "wave_direction",
                "wave_period",
                "sea_level_height_msl",
                "sea_surface_temperature",
            ]
        ),
        "start_date": date_str,
        "end_date": date_str,
        "timezone": "auto",
    }
    weather_params = {
        "latitude": latitude,
        "longitude": longitude,
        "hourly": "wind_speed_10m,wind_direction_10m",
        "start_date": date_str,
        "end_date": date_str,
        "timezone": "auto",
    }

    marine: dict = {}
    weather: dict = {}
    marine_error: str | None = None
    weather_error: str | None = None
    with httpx.Client(timeout=10) as client:
        try:
            marine_resp = _get_with_retry(client, OPEN_METEO_MARINE_URL, marine_params)
            marine = marine_resp.json().get("hourly", {})
        except Exception as exc:
            marine_error = str(exc)
        try:
            weather_resp = _get_with_retry(client, OPEN_METEO_WEATHER_URL, weather_params)
            weather = weather_resp.json().get("hourly", {})
        except Exception as exc:
            weather_error = str(exc)

    if not marine and not weather:
        detail = "Failed to load Open-Meteo forecast"
        if marine_error or weather_error:
            detail = f"Failed to load Open-Meteo forecast (marine: {marine_error or 'ok'}; weather: {weather_error or 'ok'})"
        raise HTTPException(status_code=502, detail=detail)

    marine_times: list[str] = marine.get("time") or []
    weather_times: list[str] = weather.get("time") or []
    base_times = marine_times or weather_times
    if not base_times:
        raise HTTPException(status_code=502, detail="Forecast data missing")
    sea_levels: list[float | None] = marine.get("sea_level_height_msl", [])
    wave_heights: list[float | None] = marine.get("wave_height", [])
    wave_directions: list[float | None] = marine.get("wave_direction", [])
    wave_periods: list[float | None] = marine.get("wave_period", [])
    water_temps: list[float | None] = marine.get("sea_surface_temperature", [])
    wind_speeds: list[float | None] = weather.get("wind_speed_10m", [])
    wind_dirs: list[float | None] = weather.get("wind_direction_10m", [])

    marine_idx = _closest_index(marine_times, target_time) if marine_times else -1
    weather_idx = _closest_index(weather_times, target_time) if weather_times else -1

    current_sea = sea_levels[marine_idx] if marine_idx >= 0 and marine_idx < len(sea_levels) else None
    prev_sea = sea_levels[marine_idx - 1] if marine_idx - 1 >= 0 and marine_idx - 1 < len(sea_levels) else None
    next_sea = sea_levels[marine_idx + 1] if marine_idx + 1 < len(sea_levels) else None
    sea_numeric = [v for v in sea_levels if isinstance(v, (int, float))]
    sea_min = min(sea_numeric) if sea_numeric else None
    sea_max = max(sea_numeric) if sea_numeric else None

    wave_height = wave_heights[marine_idx] if marine_idx >= 0 and marine_idx < len(wave_heights) else None
    wave_direction = wave_directions[marine_idx] if marine_idx >= 0 and marine_idx < len(wave_directions) else None
    wave_period = wave_periods[marine_idx] if marine_idx >= 0 and marine_idx < len(wave_periods) else None
    water_temp = water_temps[marine_idx] if marine_idx >= 0 and marine_idx < len(water_temps) else None
    wind_speed = (
        _nearest_non_null(wind_speeds, weather_idx)
        if weather_idx >= 0 and weather_idx < len(wind_speeds)
        else None
    )
    wind_direction = (
        _nearest_non_null(wind_dirs, weather_idx)
        if weather_idx >= 0 and weather_idx < len(wind_dirs)
        else None
    )

    tide_level = _tide_band(current_sea, sea_min, sea_max)
    tide_trend = _tide_trend(prev_sea, current_sea, next_sea)

    summary = (
        f"Wave {wave_height:.1f}m ({wave_period:.1f}s, {_cardinal_direction(wave_direction)}) · "
        f"Wind {wind_speed:.0f} km/h {_cardinal_direction(wind_direction)} · "
        f"Water {water_temp:.1f}°C · "
        f"Tide {tide_level} ({tide_trend})"
        if isinstance(wave_height, (int, float))
        and isinstance(wave_period, (int, float))
        and isinstance(wind_speed, (int, float))
        and isinstance(water_temp, (int, float))
        else "Forecast loaded"
    )

    payload = {
        "provider": "open-meteo",
        "spot_name": spot_name,
        "session_date": date_str,
        "target_time": (
            marine_times[marine_idx]
            if marine_idx >= 0 and marine_idx < len(marine_times)
            else (
                weather_times[weather_idx]
                if weather_idx >= 0 and weather_idx < len(weather_times)
                else f"{date_str}T{target_time.strftime('%H:%M')}"
            )
        ),
        "wave_height_m": wave_height,
        "wave_direction_deg": wave_direction,
        "wave_direction_cardinal": _cardinal_direction(wave_direction),
        "wave_period_s": wave_period,
        "wind_speed_kmh": wind_speed,
        "wind_direction_deg": wind_direction,
        "wind_direction_cardinal": _cardinal_direction(wind_direction),
        "water_temperature_c": water_temp,
        "sea_level_m": current_sea,
        "tide_level": tide_level,
        "tide_trend": tide_trend,
        "summary": summary,
    }
    # Do not cache incomplete weather responses to avoid sticky "wind n/a" after transient upstream issues.
    weather_has_data = bool(weather_times) and any(isinstance(v, (int, float)) for v in wind_speeds)
    if weather_has_data or not marine_error:
        _cache[key] = (_now_utc(), payload)
    return payload
