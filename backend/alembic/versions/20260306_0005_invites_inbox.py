"""add session invites and inbox"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260306_0005"
down_revision = "20260306_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    invite_status = sa.Enum(
        "pending", "pending_verification", "accepted", "declined", name="sessioninvitestatus"
    )
    invite_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "session_invites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("surf_sessions.id"), nullable=False),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("surf_groups.id"), nullable=False),
        sa.Column("invited_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("invited_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("invited_telegram_username", sa.String(length=64), nullable=True),
        sa.Column("invite_token", sa.String(length=48), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(name="sessioninvitestatus", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("accepted_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_session_invites_id", "session_invites", ["id"], unique=False)
    op.create_index("ix_session_invites_session_id", "session_invites", ["session_id"], unique=False)
    op.create_index("ix_session_invites_group_id", "session_invites", ["group_id"], unique=False)
    op.create_index("ix_session_invites_invited_by", "session_invites", ["invited_by_user_id"], unique=False)
    op.create_index("ix_session_invites_invited_user", "session_invites", ["invited_user_id"], unique=False)
    op.create_index("ix_session_invites_tg", "session_invites", ["invited_telegram_username"], unique=False)
    op.create_index("ix_session_invites_token", "session_invites", ["invite_token"], unique=True)

    op.create_table(
        "inbox_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("item_type", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=180), nullable=False),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("related_invite_id", sa.Integer(), sa.ForeignKey("session_invites.id"), nullable=True),
        sa.Column(
            "is_read",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_inbox_items_id", "inbox_items", ["id"], unique=False)
    op.create_index("ix_inbox_items_user", "inbox_items", ["user_id"], unique=False)
    op.create_index("ix_inbox_items_type", "inbox_items", ["item_type"], unique=False)
    op.create_index("ix_inbox_items_invite", "inbox_items", ["related_invite_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_inbox_items_invite", table_name="inbox_items")
    op.drop_index("ix_inbox_items_type", table_name="inbox_items")
    op.drop_index("ix_inbox_items_user", table_name="inbox_items")
    op.drop_index("ix_inbox_items_id", table_name="inbox_items")
    op.drop_table("inbox_items")

    op.drop_index("ix_session_invites_token", table_name="session_invites")
    op.drop_index("ix_session_invites_tg", table_name="session_invites")
    op.drop_index("ix_session_invites_invited_user", table_name="session_invites")
    op.drop_index("ix_session_invites_invited_by", table_name="session_invites")
    op.drop_index("ix_session_invites_group_id", table_name="session_invites")
    op.drop_index("ix_session_invites_session_id", table_name="session_invites")
    op.drop_index("ix_session_invites_id", table_name="session_invites")
    op.drop_table("session_invites")

    sa.Enum(name="sessioninvitestatus").drop(op.get_bind(), checkfirst=True)
