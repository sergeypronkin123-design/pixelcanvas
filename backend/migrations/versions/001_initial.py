"""initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('username', sa.String(100), unique=True, nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('is_admin', sa.Boolean(), default=False, nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_username', 'users', ['username'])

    op.create_table('blocks',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('x', sa.Integer(), nullable=False),
        sa.Column('y', sa.Integer(), nullable=False),
        sa.Column('width', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('height', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('owner_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='free'),
        sa.Column('base_price', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('current_price', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('reserved_by', sa.Integer(), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('reserved_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_blocks_xy', 'blocks', ['x', 'y'], unique=True)
    op.create_index('ix_blocks_status', 'blocks', ['status'])
    op.create_index('ix_blocks_owner', 'blocks', ['owner_id'])

    op.create_table('pixel_data',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('block_id', sa.Integer(), sa.ForeignKey('blocks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('local_x', sa.Integer(), nullable=False),
        sa.Column('local_y', sa.Integer(), nullable=False),
        sa.Column('color', sa.String(7), nullable=False, server_default='#000000'),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_pixel_block_xy', 'pixel_data', ['block_id', 'local_x', 'local_y'], unique=True)

    op.create_table('listings',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('block_id', sa.Integer(), sa.ForeignKey('blocks.id'), nullable=False),
        sa.Column('seller_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('price', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_listings_status', 'listings', ['status'])

    op.create_table('orders',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('block_id', sa.Integer(), sa.ForeignKey('blocks.id'), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='usd'),
        sa.Column('provider', sa.String(50), nullable=False, server_default='stripe'),
        sa.Column('provider_session_id', sa.String(255), unique=True, nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('order_type', sa.String(50), nullable=False, server_default='primary_purchase'),
        sa.Column('listing_id', sa.Integer(), sa.ForeignKey('listings.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_orders_session', 'orders', ['provider_session_id'])
    op.create_index('ix_orders_status', 'orders', ['status'])

    op.create_table('transactions',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('order_id', sa.Integer(), sa.ForeignKey('orders.id'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('block_id', sa.Integer(), sa.ForeignKey('blocks.id'), nullable=False),
        sa.Column('transaction_type', sa.String(30), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),
        sa.Column('fee_amount', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table('webhook_events',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('provider', sa.String(50), nullable=False, server_default='stripe'),
        sa.Column('event_type', sa.String(100), nullable=False),
        sa.Column('external_id', sa.String(255), unique=True, nullable=False),
        sa.Column('processed', sa.Boolean(), default=False, nullable=False),
        sa.Column('payload_json', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_webhook_external_id', 'webhook_events', ['external_id'])


def downgrade() -> None:
    op.drop_table('webhook_events')
    op.drop_table('transactions')
    op.drop_table('orders')
    op.drop_table('listings')
    op.drop_table('pixel_data')
    op.drop_table('blocks')
    op.drop_table('users')
