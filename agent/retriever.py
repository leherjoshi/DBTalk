"""
retriever.py — RAG-based schema retrieval from ChromaDB.

# INTERN NOTE: RAG retrieval explained
# At query time we embed the user's natural-language question (e.g. "top
# revenue by category") using the same model that was used during indexing.
# ChromaDB performs an approximate nearest-neighbor (ANN) cosine similarity
# search and returns the k most semantically similar table schemas.
# We then format those schemas as a compact text block and inject them into
# the LLM system prompt. This gives the LLM precise, relevant context without
# overloading the prompt with irrelevant tables.
# The quality of retrieval directly impacts SQL accuracy — better descriptions
# in the semantic layer = better retrieval = fewer hallucinated joins.
"""

import os
import logging
from typing import Optional, cast

import chromadb
from chromadb import Documents, EmbeddingFunction, Embeddings
from google import genai
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

COLLECTION_NAME = "schema_index"
_client: Optional[chromadb.PersistentClient] = None
_collection: Optional[chromadb.Collection] = None


class GeminiEmbeddingFunction(EmbeddingFunction[Documents]):
    """Custom embedding function for Google Gemini using new google.genai package."""
    
    def __init__(self, api_key: str):
        self.client = genai.Client(api_key=api_key)
    
    def __call__(self, input: Documents) -> Embeddings:
        embeddings = []
        for text in input:
            result = self.client.models.embed_content(
                model="models/gemini-embedding-001",
                contents=text
            )
            embeddings.append(result.embeddings[0].values)
        return cast(Embeddings, embeddings)


def _get_collection() -> chromadb.Collection:
    """Lazily initialise and cache the ChromaDB collection."""
    global _client, _collection
    if _collection is not None:
        return _collection

    persist_dir = os.getenv("CHROMA_PERSIST_DIR", "./chroma_store")
    google_api_key = os.getenv("GOOGLE_API_KEY", "")

    _client = chromadb.PersistentClient(path=persist_dir)
    embedding_fn = GeminiEmbeddingFunction(api_key=google_api_key)
    _collection = _client.get_collection(
        name=COLLECTION_NAME,
        embedding_function=embedding_fn,
    )
    return _collection


def get_relevant_schema(query: str, k: int = 3) -> str:
    """
    Embed *query*, similarity-search ChromaDB, and return a formatted
    table+column block suitable for injection into an LLM prompt.

    Args:
        query: The user's natural-language question.
        k:     Number of most relevant tables to retrieve.

    Returns:
        A newline-delimited schema block string.
    """
    try:
        collection = _get_collection()
        collection_count = collection.count()
        if collection_count == 0:
            logger.debug("Schema collection is empty; returning empty context for query: %s", query)
            return ""

        n_results = min(k, collection_count)
        if n_results < 1:
            logger.debug("Requested n_results=%d; returning empty context for query: %s", n_results, query)
            return ""

        results = collection.query(query_texts=[query], n_results=n_results)
        documents: list[str] = results["documents"][0]  # type: ignore[index]
        logger.debug("Retrieved %d schema snippets for query: %s", len(documents), query)
        return "\n\n---\n\n".join(documents)
    except Exception as exc:
        logger.warning("Schema retrieval failed: %s — falling back to empty context.", exc)
        return ""
