"""add user avatar url"""

from alembic import op
import sqlalchemy as sa

revision = "20260307_0009"
down_revision = "20260307_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("avatar_url", sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "avatar_url")
