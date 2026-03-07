"""add user car fields"""

from alembic import op
import sqlalchemy as sa

revision = "20260307_0014"
down_revision = "20260307_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("has_car", sa.Boolean(), nullable=True))
    op.add_column("users", sa.Column("car_seats", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "car_seats")
    op.drop_column("users", "has_car")
