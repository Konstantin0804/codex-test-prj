"""add session photos table"""

from alembic import op
import sqlalchemy as sa

revision = "20260306_0006"
down_revision = "20260306_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "session_photos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("surf_sessions.id"), nullable=False),
        sa.Column("uploaded_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("object_key", sa.String(length=255), nullable=False),
        sa.Column("public_url", sa.String(length=512), nullable=False),
        sa.Column("content_type", sa.String(length=80), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_session_photos_id", "session_photos", ["id"], unique=False)
    op.create_index("ix_session_photos_session_id", "session_photos", ["session_id"], unique=False)
    op.create_index("ix_session_photos_uploaded_by", "session_photos", ["uploaded_by_user_id"], unique=False)
    op.create_index("ix_session_photos_object_key", "session_photos", ["object_key"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_session_photos_object_key", table_name="session_photos")
    op.drop_index("ix_session_photos_uploaded_by", table_name="session_photos")
    op.drop_index("ix_session_photos_session_id", table_name="session_photos")
    op.drop_index("ix_session_photos_id", table_name="session_photos")
    op.drop_table("session_photos")
