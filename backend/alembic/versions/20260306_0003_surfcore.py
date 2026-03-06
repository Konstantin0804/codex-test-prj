"""add surf crew core tables"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "20260306_0003"
down_revision = "20260306_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    group_role = sa.Enum("admin", "member", name="grouprole")
    invite_status = sa.Enum("pending", "accepted", "expired", name="invitestatus")
    session_level = sa.Enum("beginner", "intermediate", "advanced", "mixed", name="sessionlevel")
    rsvp_status = sa.Enum("going", "maybe", "not_going", name="rsvpstatus")

    group_role.create(op.get_bind(), checkfirst=True)
    invite_status.create(op.get_bind(), checkfirst=True)
    session_level.create(op.get_bind(), checkfirst=True)
    rsvp_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "surf_groups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_surf_groups_id", "surf_groups", ["id"], unique=False)
    op.create_index("ix_surf_groups_created_by", "surf_groups", ["created_by"], unique=False)

    op.create_table(
        "group_memberships",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("surf_groups.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("role", postgresql.ENUM(name="grouprole", create_type=False), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("group_id", "user_id", name="uq_group_membership"),
    )
    op.create_index("ix_group_memberships_id", "group_memberships", ["id"], unique=False)
    op.create_index("ix_group_memberships_group_id", "group_memberships", ["group_id"], unique=False)
    op.create_index("ix_group_memberships_user_id", "group_memberships", ["user_id"], unique=False)

    op.create_table(
        "group_invites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("surf_groups.id"), nullable=False),
        sa.Column("code", sa.String(length=32), nullable=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", postgresql.ENUM(name="invitestatus", create_type=False), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("accepted_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("accepted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_group_invites_id", "group_invites", ["id"], unique=False)
    op.create_index("ix_group_invites_group_id", "group_invites", ["group_id"], unique=False)
    op.create_index("ix_group_invites_code", "group_invites", ["code"], unique=True)

    op.create_table(
        "surf_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("surf_groups.id"), nullable=False),
        sa.Column("created_by", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("spot_name", sa.String(length=140), nullable=False),
        sa.Column("session_date", sa.Date(), nullable=False),
        sa.Column("meeting_time", sa.Time(), nullable=True),
        sa.Column("level", postgresql.ENUM(name="sessionlevel", create_type=False), nullable=False),
        sa.Column("forecast_note", sa.Text(), nullable=False, server_default=""),
        sa.Column("logistics_note", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_surf_sessions_id", "surf_sessions", ["id"], unique=False)
    op.create_index("ix_surf_sessions_group_id", "surf_sessions", ["group_id"], unique=False)
    op.create_index("ix_surf_sessions_session_date", "surf_sessions", ["session_date"], unique=False)

    op.create_table(
        "session_rsvps",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("surf_sessions.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", postgresql.ENUM(name="rsvpstatus", create_type=False), nullable=False),
        sa.Column("transport_note", sa.String(length=180), nullable=False, server_default=""),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("session_id", "user_id", name="uq_session_rsvp"),
    )
    op.create_index("ix_session_rsvps_id", "session_rsvps", ["id"], unique=False)
    op.create_index("ix_session_rsvps_session_id", "session_rsvps", ["session_id"], unique=False)

    op.create_table(
        "session_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("surf_sessions.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("wave_score", sa.Integer(), nullable=False),
        sa.Column("crowd_score", sa.Integer(), nullable=False),
        sa.Column("wind_score", sa.Integer(), nullable=False),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_session_reports_id", "session_reports", ["id"], unique=False)
    op.create_index("ix_session_reports_session_id", "session_reports", ["session_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_session_reports_session_id", table_name="session_reports")
    op.drop_index("ix_session_reports_id", table_name="session_reports")
    op.drop_table("session_reports")

    op.drop_index("ix_session_rsvps_session_id", table_name="session_rsvps")
    op.drop_index("ix_session_rsvps_id", table_name="session_rsvps")
    op.drop_table("session_rsvps")

    op.drop_index("ix_surf_sessions_session_date", table_name="surf_sessions")
    op.drop_index("ix_surf_sessions_group_id", table_name="surf_sessions")
    op.drop_index("ix_surf_sessions_id", table_name="surf_sessions")
    op.drop_table("surf_sessions")

    op.drop_index("ix_group_invites_code", table_name="group_invites")
    op.drop_index("ix_group_invites_group_id", table_name="group_invites")
    op.drop_index("ix_group_invites_id", table_name="group_invites")
    op.drop_table("group_invites")

    op.drop_index("ix_group_memberships_user_id", table_name="group_memberships")
    op.drop_index("ix_group_memberships_group_id", table_name="group_memberships")
    op.drop_index("ix_group_memberships_id", table_name="group_memberships")
    op.drop_table("group_memberships")

    op.drop_index("ix_surf_groups_created_by", table_name="surf_groups")
    op.drop_index("ix_surf_groups_id", table_name="surf_groups")
    op.drop_table("surf_groups")

    sa.Enum(name="rsvpstatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="sessionlevel").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="invitestatus").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="grouprole").drop(op.get_bind(), checkfirst=True)
