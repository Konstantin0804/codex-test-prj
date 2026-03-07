"""add friendships and friend requests"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260307_0010"
down_revision = "20260307_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    friend_request_status = sa.Enum("pending", "accepted", "declined", name="friendrequeststatus")
    friend_request_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "friend_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("from_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("to_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(name="friendrequeststatus", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("acted_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("from_user_id", "to_user_id", name="uq_friend_request_pair"),
    )
    op.create_index("ix_friend_requests_id", "friend_requests", ["id"], unique=False)
    op.create_index("ix_friend_requests_from_user", "friend_requests", ["from_user_id"], unique=False)
    op.create_index("ix_friend_requests_to_user", "friend_requests", ["to_user_id"], unique=False)

    op.create_table(
        "friendships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_low_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("user_high_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("user_low_id", "user_high_id", name="uq_friendship_pair"),
    )
    op.create_index("ix_friendships_id", "friendships", ["id"], unique=False)
    op.create_index("ix_friendships_low", "friendships", ["user_low_id"], unique=False)
    op.create_index("ix_friendships_high", "friendships", ["user_high_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_friendships_high", table_name="friendships")
    op.drop_index("ix_friendships_low", table_name="friendships")
    op.drop_index("ix_friendships_id", table_name="friendships")
    op.drop_table("friendships")

    op.drop_index("ix_friend_requests_to_user", table_name="friend_requests")
    op.drop_index("ix_friend_requests_from_user", table_name="friend_requests")
    op.drop_index("ix_friend_requests_id", table_name="friend_requests")
    op.drop_table("friend_requests")

    sa.Enum(name="friendrequeststatus").drop(op.get_bind(), checkfirst=True)
