import json
from datetime import date, time
from pathlib import Path

from app.services import forecast_service


class _FakeResponse:
    def __init__(self, payload: dict) -> None:
        self._payload = payload

    def json(self) -> dict:
        return self._payload

    def raise_for_status(self) -> None:
        return None


def _load_fixture(name: str) -> dict:
    fixtures_dir = Path(__file__).parent / "fixtures" / "open_meteo"
    return json.loads((fixtures_dir / name).read_text())


def test_open_meteo_mapping_uses_non_null_legacy_wind_keys(monkeypatch) -> None:
    marine_payload = _load_fixture("marine_sopelana_2026-03-08.json")
    weather_payload = _load_fixture("weather_sopelana_2026-03-08_legacy_wind_keys.json")
    expected_ui_payload = _load_fixture("ui_expected_sopelana_2026-03-08_06-00.json")

    def fake_get_with_retry(_client, url: str, _params: dict, attempts: int = 2):
        if "marine-api.open-meteo.com" in url:
            return _FakeResponse(marine_payload)
        if "api.open-meteo.com" in url:
            return _FakeResponse(weather_payload)
        raise AssertionError(f"Unexpected URL: {url}")

    forecast_service._cache.clear()
    monkeypatch.setattr(forecast_service, "_get_with_retry", fake_get_with_retry)

    payload = forecast_service.get_open_meteo_forecast(
        spot_name="Sopelana",
        session_date=date(2026, 3, 8),
        meeting_time=time(6, 0),
    )

    assert payload == expected_ui_payload

