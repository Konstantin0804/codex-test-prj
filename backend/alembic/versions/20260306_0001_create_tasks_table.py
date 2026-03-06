"""create tasks table"""

from alembic import op
import sqlalchemy as sa

revision = "20260306_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    task_status = sa.Enum("backlog", "in_progress", "done", name="taskstatus")
    task_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", task_status, nullable=False, server_default="backlog"),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("estimate_hours", sa.Integer(), nullable=False, server_default="4"),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_tasks_id", "tasks", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_tasks_id", table_name="tasks")
    op.drop_table("tasks")
    sa.Enum(name="taskstatus").drop(op.get_bind(), checkfirst=True)
