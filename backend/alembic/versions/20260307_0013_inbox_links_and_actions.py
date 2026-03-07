"""add inbox relations for friend/session navigation"""

from alembic import op
import sqlalchemy as sa

revision = "20260307_0013"
down_revision = "20260307_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("inbox_items", sa.Column("related_friend_request_id", sa.Integer(), nullable=True))
    op.add_column("inbox_items", sa.Column("related_group_id", sa.Integer(), nullable=True))
    op.add_column("inbox_items", sa.Column("related_session_id", sa.Integer(), nullable=True))
    op.add_column("inbox_items", sa.Column("related_user_id", sa.Integer(), nullable=True))

    op.create_foreign_key(
        "fk_inbox_related_friend_request",
        "inbox_items",
        "friend_requests",
        ["related_friend_request_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_inbox_related_group",
        "inbox_items",
        "surf_groups",
        ["related_group_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_inbox_related_session",
        "inbox_items",
        "surf_sessions",
        ["related_session_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_inbox_related_user",
        "inbox_items",
        "users",
        ["related_user_id"],
        ["id"],
    )

    op.create_index(
        "ix_inbox_items_friend_request",
        "inbox_items",
        ["related_friend_request_id"],
        unique=False,
    )
    op.create_index(
        "ix_inbox_items_group",
        "inbox_items",
        ["related_group_id"],
        unique=False,
    )
    op.create_index(
        "ix_inbox_items_session",
        "inbox_items",
        ["related_session_id"],
        unique=False,
    )
    op.create_index(
        "ix_inbox_items_related_user",
        "inbox_items",
        ["related_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_inbox_items_related_user", table_name="inbox_items")
    op.drop_index("ix_inbox_items_session", table_name="inbox_items")
    op.drop_index("ix_inbox_items_group", table_name="inbox_items")
    op.drop_index("ix_inbox_items_friend_request", table_name="inbox_items")

    op.drop_constraint("fk_inbox_related_user", "inbox_items", type_="foreignkey")
    op.drop_constraint("fk_inbox_related_session", "inbox_items", type_="foreignkey")
    op.drop_constraint("fk_inbox_related_group", "inbox_items", type_="foreignkey")
    op.drop_constraint("fk_inbox_related_friend_request", "inbox_items", type_="foreignkey")

    op.drop_column("inbox_items", "related_user_id")
    op.drop_column("inbox_items", "related_session_id")
    op.drop_column("inbox_items", "related_group_id")
    op.drop_column("inbox_items", "related_friend_request_id")
