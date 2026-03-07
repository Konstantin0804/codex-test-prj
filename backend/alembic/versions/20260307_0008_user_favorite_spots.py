"""add user favorite spots"""

from alembic import op
import sqlalchemy as sa

revision = "20260307_0008"
down_revision = "20260307_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("favorite_spots_csv", sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "favorite_spots_csv")
