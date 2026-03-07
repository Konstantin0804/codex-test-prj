"""add session completion and participant feedback"""

from alembic import op
import sqlalchemy as sa

revision = "20260307_0012"
down_revision = "20260307_0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("surf_sessions", sa.Column("completed_at", sa.DateTime(), nullable=True))

    op.create_table(
        "session_feedback",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("surf_sessions.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("stars", sa.Integer(), nullable=True),
        sa.Column("comment", sa.Text(), nullable=False, server_default=""),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("session_id", "user_id", name="uq_session_feedback_user"),
    )
    op.create_index("ix_session_feedback_id", "session_feedback", ["id"], unique=False)
    op.create_index("ix_session_feedback_session_id", "session_feedback", ["session_id"], unique=False)
    op.create_index("ix_session_feedback_user_id", "session_feedback", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_session_feedback_user_id", table_name="session_feedback")
    op.drop_index("ix_session_feedback_session_id", table_name="session_feedback")
    op.drop_index("ix_session_feedback_id", table_name="session_feedback")
    op.drop_table("session_feedback")

    op.drop_column("surf_sessions", "completed_at")
