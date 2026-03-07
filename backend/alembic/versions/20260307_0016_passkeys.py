"""add passkey credential and challenge tables"""

from alembic import op
import sqlalchemy as sa

revision = "20260307_0016"
down_revision = "20260307_0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "passkey_credentials",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("credential_id", sa.String(length=255), nullable=False),
        sa.Column("public_key_b64", sa.String(length=4096), nullable=False),
        sa.Column("sign_count", sa.Integer(), nullable=False),
        sa.Column("transports_csv", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_passkey_credentials_id", "passkey_credentials", ["id"], unique=False)
    op.create_index(
        "ix_passkey_credentials_credential_id",
        "passkey_credentials",
        ["credential_id"],
        unique=True,
    )
    op.create_index("ix_passkey_credentials_user_id", "passkey_credentials", ["user_id"], unique=False)

    op.create_table(
        "passkey_challenges",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("flow", sa.String(length=24), nullable=False),
        sa.Column("challenge", sa.String(length=255), nullable=False),
        sa.Column("username", sa.String(length=80), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_passkey_challenges_id", "passkey_challenges", ["id"], unique=False)
    op.create_index("ix_passkey_challenges_flow", "passkey_challenges", ["flow"], unique=False)
    op.create_index("ix_passkey_challenges_challenge", "passkey_challenges", ["challenge"], unique=True)
    op.create_index("ix_passkey_challenges_username", "passkey_challenges", ["username"], unique=False)
    op.create_index("ix_passkey_challenges_user_id", "passkey_challenges", ["user_id"], unique=False)
    op.create_index("ix_passkey_challenges_expires_at", "passkey_challenges", ["expires_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_passkey_challenges_expires_at", table_name="passkey_challenges")
    op.drop_index("ix_passkey_challenges_user_id", table_name="passkey_challenges")
    op.drop_index("ix_passkey_challenges_username", table_name="passkey_challenges")
    op.drop_index("ix_passkey_challenges_challenge", table_name="passkey_challenges")
    op.drop_index("ix_passkey_challenges_flow", table_name="passkey_challenges")
    op.drop_index("ix_passkey_challenges_id", table_name="passkey_challenges")
    op.drop_table("passkey_challenges")

    op.drop_index("ix_passkey_credentials_user_id", table_name="passkey_credentials")
    op.drop_index("ix_passkey_credentials_credential_id", table_name="passkey_credentials")
    op.drop_index("ix_passkey_credentials_id", table_name="passkey_credentials")
    op.drop_table("passkey_credentials")
