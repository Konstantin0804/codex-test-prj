"""add session comments table"""

from alembic import op
import sqlalchemy as sa

revision = "20260308_0020"
down_revision = "20260308_0019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "session_comments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["session_id"], ["surf_sessions.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_session_comments_id"), "session_comments", ["id"], unique=False)
    op.create_index(op.f("ix_session_comments_session_id"), "session_comments", ["session_id"], unique=False)
    op.create_index(op.f("ix_session_comments_user_id"), "session_comments", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_session_comments_user_id"), table_name="session_comments")
    op.drop_index(op.f("ix_session_comments_session_id"), table_name="session_comments")
    op.drop_index(op.f("ix_session_comments_id"), table_name="session_comments")
    op.drop_table("session_comments")
