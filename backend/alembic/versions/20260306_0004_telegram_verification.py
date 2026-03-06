"""add telegram verification fields"""

from alembic import op
import sqlalchemy as sa

revision = "20260306_0004"
down_revision = "20260306_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("telegram_username", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("telegram_chat_id", sa.BigInteger(), nullable=True))
    op.add_column(
        "users",
        sa.Column(
            "is_telegram_verified",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column("users", sa.Column("telegram_verify_token", sa.String(length=64), nullable=True))

    op.create_index("ix_users_telegram_username", "users", ["telegram_username"], unique=True)
    op.create_index("ix_users_telegram_verify_token", "users", ["telegram_verify_token"], unique=False)

    op.create_table(
        "telegram_chat_links",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("telegram_username", sa.String(length=64), nullable=False),
        sa.Column("chat_id", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_telegram_chat_links_id", "telegram_chat_links", ["id"], unique=False)
    op.create_index(
        "ix_telegram_chat_links_telegram_username",
        "telegram_chat_links",
        ["telegram_username"],
        unique=True,
    )
    op.create_index("ix_telegram_chat_links_chat_id", "telegram_chat_links", ["chat_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_telegram_chat_links_chat_id", table_name="telegram_chat_links")
    op.drop_index("ix_telegram_chat_links_telegram_username", table_name="telegram_chat_links")
    op.drop_index("ix_telegram_chat_links_id", table_name="telegram_chat_links")
    op.drop_table("telegram_chat_links")

    op.drop_index("ix_users_telegram_verify_token", table_name="users")
    op.drop_index("ix_users_telegram_username", table_name="users")
    op.drop_column("users", "telegram_verify_token")
    op.drop_column("users", "is_telegram_verified")
    op.drop_column("users", "telegram_chat_id")
    op.drop_column("users", "telegram_username")
