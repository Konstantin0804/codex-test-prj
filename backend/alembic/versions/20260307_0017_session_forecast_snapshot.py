"""store forecast snapshot on surf sessions"""

from alembic import op
import sqlalchemy as sa

revision = "20260307_0017"
down_revision = "20260307_0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("surf_sessions", sa.Column("forecast_provider", sa.String(length=40), nullable=True))
    op.add_column("surf_sessions", sa.Column("forecast_target_time", sa.String(length=32), nullable=True))
    op.add_column("surf_sessions", sa.Column("forecast_wave_height_m", sa.Float(), nullable=True))
    op.add_column("surf_sessions", sa.Column("forecast_wave_direction_deg", sa.Float(), nullable=True))
    op.add_column("surf_sessions", sa.Column("forecast_wave_direction_cardinal", sa.String(length=8), nullable=True))
    op.add_column("surf_sessions", sa.Column("forecast_wave_period_s", sa.Float(), nullable=True))
    op.add_column("surf_sessions", sa.Column("forecast_wind_speed_kmh", sa.Float(), nullable=True))
    op.add_column("surf_sessions", sa.Column("forecast_wind_direction_deg", sa.Float(), nullable=True))
    op.add_column("surf_sessions", sa.Column("forecast_wind_direction_cardinal", sa.String(length=8), nullable=True))
    op.add_column("surf_sessions", sa.Column("forecast_water_temperature_c", sa.Float(), nullable=True))
    op.add_column("surf_sessions", sa.Column("forecast_sea_level_m", sa.Float(), nullable=True))
    op.add_column("surf_sessions", sa.Column("forecast_tide_level", sa.String(length=16), nullable=True))
    op.add_column("surf_sessions", sa.Column("forecast_tide_trend", sa.String(length=16), nullable=True))
    op.add_column("surf_sessions", sa.Column("forecast_summary", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("surf_sessions", "forecast_summary")
    op.drop_column("surf_sessions", "forecast_tide_trend")
    op.drop_column("surf_sessions", "forecast_tide_level")
    op.drop_column("surf_sessions", "forecast_sea_level_m")
    op.drop_column("surf_sessions", "forecast_water_temperature_c")
    op.drop_column("surf_sessions", "forecast_wind_direction_cardinal")
    op.drop_column("surf_sessions", "forecast_wind_direction_deg")
    op.drop_column("surf_sessions", "forecast_wind_speed_kmh")
    op.drop_column("surf_sessions", "forecast_wave_period_s")
    op.drop_column("surf_sessions", "forecast_wave_direction_cardinal")
    op.drop_column("surf_sessions", "forecast_wave_direction_deg")
    op.drop_column("surf_sessions", "forecast_wave_height_m")
    op.drop_column("surf_sessions", "forecast_target_time")
    op.drop_column("surf_sessions", "forecast_provider")
