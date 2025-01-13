"""Split knowledge bases into document collections and vector indices

Revision ID: 20240320_split_knowledge_bases
Revises:
Create Date: 2024-03-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20240320_split_knowledge_bases'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create document_collections table
    op.create_table(
        'document_collections',
        sa.Column('_intid', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('id', sa.String(), sa.Computed("'DC' || _intid"), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='processing'),
        sa.Column('document_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('chunk_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_message', sa.String(), nullable=True),
        sa.Column('text_processing_config', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('_intid'),
        sa.UniqueConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # Create vector_indices table
    op.create_table(
        'vector_indices',
        sa.Column('_intid', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('id', sa.String(), sa.Computed("'VI' || _intid"), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='processing'),
        sa.Column('document_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('chunk_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_message', sa.String(), nullable=True),
        sa.Column('embedding_config', sa.JSON(), nullable=False),
        sa.Column('collection_id', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['collection_id'], ['document_collections.id'], ),
        sa.PrimaryKeyConstraint('_intid'),
        sa.UniqueConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # Migrate data from knowledge_bases table
    op.execute("""
        INSERT INTO document_collections (
            name, description, status, document_count, chunk_count,
            error_message, text_processing_config, created_at, updated_at
        )
        SELECT
            name, description, status, document_count, chunk_count,
            error_message, text_processing_config, created_at, updated_at
        FROM knowledge_bases
    """)

    # Create vector indices for existing knowledge bases
    op.execute("""
        INSERT INTO vector_indices (
            name, description, status, document_count, chunk_count,
            error_message, embedding_config, collection_id, created_at, updated_at
        )
        SELECT
            name || ' Index', description, status, document_count, chunk_count,
            error_message, embedding_config, id, created_at, updated_at
        FROM knowledge_bases
        WHERE embedding_config IS NOT NULL
    """)

    # Drop old table
    op.drop_table('knowledge_bases')


def downgrade() -> None:
    # Create knowledge_bases table
    op.create_table(
        'knowledge_bases',
        sa.Column('_intid', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('id', sa.String(), sa.Computed("'KB' || _intid"), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False, server_default='processing'),
        sa.Column('document_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('chunk_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_message', sa.String(), nullable=True),
        sa.Column('text_processing_config', sa.JSON(), nullable=False),
        sa.Column('embedding_config', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('_intid'),
        sa.UniqueConstraint('id'),
        sa.UniqueConstraint('name')
    )

    # Migrate data back from document_collections and vector_indices
    op.execute("""
        INSERT INTO knowledge_bases (
            name, description, status, document_count, chunk_count,
            error_message, text_processing_config, embedding_config, created_at, updated_at
        )
        SELECT
            dc.name, dc.description, dc.status, dc.document_count, dc.chunk_count,
            dc.error_message, dc.text_processing_config, vi.embedding_config, dc.created_at, dc.updated_at
        FROM document_collections dc
        LEFT JOIN vector_indices vi ON vi.collection_id = dc.id
    """)

    # Drop new tables
    op.drop_table('vector_indices')
    op.drop_table('document_collections')