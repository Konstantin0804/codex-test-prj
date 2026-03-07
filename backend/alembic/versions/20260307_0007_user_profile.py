"""add user profile fields"""

from alembic import op
import sqlalchemy as sa

revision = "20260307_0007"
down_revision = "20260306_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("nickname", sa.String(length=80), nullable=True))
    op.add_column("users", sa.Column("age", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("city", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("surfboard", sa.String(length=140), nullable=True))
    op.add_column("users", sa.Column("surf_level", sa.String(length=24), nullable=True))
    op.add_column("users", sa.Column("phone_number", sa.String(length=24), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "phone_number")
    op.drop_column("users", "surf_level")
    op.drop_column("users", "surfboard")
    op.drop_column("users", "city")
    op.drop_column("users", "age")
    op.drop_column("users", "nickname")
