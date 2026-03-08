"""add crew member invites and inbox relation"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260308_0018"
down_revision = "20260307_0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    invite_status = sa.Enum("pending", "accepted", "declined", name="groupmemberinvitestatus")
    invite_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "group_member_invites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("group_id", sa.Integer(), nullable=False),
        sa.Column("invited_by_user_id", sa.Integer(), nullable=False),
        sa.Column("invited_user_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(name="groupmemberinvitestatus", create_type=False),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("acted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["group_id"], ["surf_groups.id"]),
        sa.ForeignKeyConstraint(["invited_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["invited_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("group_id", "invited_user_id", name="uq_group_member_invite"),
    )
    op.create_index("ix_group_member_invites_id", "group_member_invites", ["id"], unique=False)
    op.create_index("ix_group_member_invites_group_id", "group_member_invites", ["group_id"], unique=False)
    op.create_index("ix_group_member_invites_invited_by", "group_member_invites", ["invited_by_user_id"], unique=False)
    op.create_index("ix_group_member_invites_invited_user", "group_member_invites", ["invited_user_id"], unique=False)

    op.add_column("inbox_items", sa.Column("related_group_member_invite_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_inbox_related_group_member_invite",
        "inbox_items",
        "group_member_invites",
        ["related_group_member_invite_id"],
        ["id"],
    )
    op.create_index(
        "ix_inbox_items_group_member_invite",
        "inbox_items",
        ["related_group_member_invite_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_inbox_items_group_member_invite", table_name="inbox_items")
    op.drop_constraint("fk_inbox_related_group_member_invite", "inbox_items", type_="foreignkey")
    op.drop_column("inbox_items", "related_group_member_invite_id")

    op.drop_index("ix_group_member_invites_invited_user", table_name="group_member_invites")
    op.drop_index("ix_group_member_invites_invited_by", table_name="group_member_invites")
    op.drop_index("ix_group_member_invites_group_id", table_name="group_member_invites")
    op.drop_index("ix_group_member_invites_id", table_name="group_member_invites")
    op.drop_table("group_member_invites")
    sa.Enum(name="groupmemberinvitestatus").drop(op.get_bind(), checkfirst=True)
