import uuid
from typing import Dict, List, Optional, Tuple, Union
from jinja2 import Template

import tiktoken
from .embedder import EmbeddingModels, get_multiple_text_embeddings, EmbeddingArray
from .schemas.document_schemas import (
    Document,
    DocumentChunk,
    DocumentChunkMetadata,
    ChunkingConfig,
)

# Global variables
tokenizer = tiktoken.get_encoding(
    "cl100k_base"
)  # The encoding scheme to use for tokenization


def apply_template(text: str, template: str, metadata_template: Dict[str, str]) -> Tuple[str, Dict[str, str]]:
    """Apply Jinja template to chunk text and metadata."""
    try:
        # Create template context
        context = {
            "text": text,
            # Add more context variables as needed
        }

        # Process text template
        text_template = Template(template)
        processed_text = text_template.render(**context)

        # Process metadata templates
        processed_metadata: Dict[str, str] = {}
        for key, template_str in metadata_template.items():
            metadata_template_obj = Template(template_str)
            processed_metadata[key] = metadata_template_obj.render(**context)

        return processed_text, processed_metadata
    except Exception as e:
        # Log error and return original text with basic metadata
        print(f"Error applying template: {e}")
        return text, {"type": "text_chunk", "error": str(e)}


def get_text_chunks(text: str, config: ChunkingConfig) -> List[str]:
    """
    Split a text into chunks based on the provided configuration.

    Args:
        text: The text to split into chunks.
        config: ChunkingConfig containing the chunking parameters.

    Returns:
        A list of text chunks.
    """
    if not text or text.isspace():
        return []

    tokens = tokenizer.encode(text, disallowed_special=())
    chunks: List[str] = []
    num_chunks = 0

    while tokens and num_chunks < config.max_num_chunks:
        chunk = tokens[: config.chunk_token_size]
        chunk_text = tokenizer.decode(chunk)

        if not chunk_text or chunk_text.isspace():
            tokens = tokens[len(chunk) :]
            continue

        last_punctuation = max(
            chunk_text.rfind("."),
            chunk_text.rfind("?"),
            chunk_text.rfind("!"),
            chunk_text.rfind("\n"),
        )

        if last_punctuation != -1 and last_punctuation > config.min_chunk_size_chars:
            chunk_text = chunk_text[: last_punctuation + 1]

        chunk_text_to_append = chunk_text.replace("\n", " ").strip()

        if len(chunk_text_to_append) > config.min_chunk_length_to_embed:
            chunks.append(chunk_text_to_append)

        tokens = tokens[len(tokenizer.encode(chunk_text, disallowed_special=())) :]
        num_chunks += 1

    if tokens:
        remaining_text = tokenizer.decode(tokens).replace("\n", " ").strip()
        if len(remaining_text) > config.min_chunk_length_to_embed:
            chunks.append(remaining_text)

    return chunks


def create_document_chunks(
    doc: Document, config: ChunkingConfig
) -> Tuple[List[DocumentChunk], str]:
    """
    Create a list of document chunks from a document object.

    Args:
        doc: The document object to create chunks from.
        config: ChunkingConfig containing the chunking parameters.

    Returns:
        A tuple of (doc_chunks, doc_id).
    """
    if not doc.text or doc.text.isspace():
        return [], doc.id or str(uuid.uuid4())

    doc_id = doc.id or str(uuid.uuid4())
    text_chunks = get_text_chunks(doc.text, config)

    metadata = (
        DocumentChunkMetadata(**doc.metadata.model_dump())
        if doc.metadata is not None
        else DocumentChunkMetadata()
    )
    metadata.document_id = doc_id

    doc_chunks: List[DocumentChunk] = []
    for i, text_chunk in enumerate(text_chunks):
        chunk_id = f"{doc_id}_{i}"

        # Apply template if enabled
        if config.template.enabled:
            processed_text, processed_metadata = apply_template(
                text_chunk,
                config.template.template,
                config.template.metadata_template or {}
            )
            # Update metadata with processed metadata
            chunk_metadata = metadata.model_copy()
            chunk_metadata.custom_metadata = processed_metadata
        else:
            processed_text = text_chunk
            chunk_metadata = metadata

        doc_chunk = DocumentChunk(
            id=chunk_id,
            text=processed_text,
            metadata=chunk_metadata,
        )
        doc_chunks.append(doc_chunk)

    return doc_chunks, doc_id


async def get_document_chunks(
    documents: List[Document],
    chunk_token_size: Optional[Union[int, ChunkingConfig]] = None,
    model: str = EmbeddingModels.TEXT_EMBEDDING_3_SMALL.value,
) -> Dict[str, List[DocumentChunk]]:
    """
    Convert documents into chunks with embeddings.

    Args:
        documents: The list of documents to convert.
        chunk_token_size: Either a ChunkingConfig object or a legacy integer chunk size.
        model: The embedding model to use.

    Returns:
        A dictionary mapping document ids to their chunks.
    """
    # Handle legacy integer chunk_token_size
    if isinstance(chunk_token_size, int):
        config = ChunkingConfig(chunk_token_size=chunk_token_size)
    elif isinstance(chunk_token_size, ChunkingConfig):
        config = chunk_token_size
    else:
        config = ChunkingConfig()  # Use defaults

    chunks: Dict[str, List[DocumentChunk]] = {}
    all_chunks: List[DocumentChunk] = []

    for doc in documents:
        doc_chunks, doc_id = create_document_chunks(doc, config)
        all_chunks.extend(doc_chunks)
        chunks[doc_id] = doc_chunks

    if not all_chunks:
        return {}

    chunk_texts = [chunk.text for chunk in all_chunks]
    embeddings: EmbeddingArray = await get_multiple_text_embeddings(
        docs=chunk_texts, model=model, batch_size=config.embeddings_batch_size
    )

    for i, chunk in enumerate(all_chunks):
        chunk.embedding = embeddings[i].tolist()

    return chunks
