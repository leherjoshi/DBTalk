#!/bin/bash
set -e

echo "=== Starting Text-to-SQL API ==="

# Copy the pre-seeded database to /tmp (writable location on Render)
if [ -f "data/olist.db" ]; then
    echo "Copying database to /tmp for write access..."
    mkdir -p /tmp/data
    cp data/olist.db /tmp/data/olist.db
    chmod 644 /tmp/data/olist.db
    echo "Database copied successfully"
    
    # Set DATABASE_URL to point to the writable copy
    export DATABASE_URL="sqlite:////tmp/data/olist.db"
    echo "DATABASE_URL set to: $DATABASE_URL"
else
    echo "WARNING: data/olist.db not found in repo!"
fi

# Copy ChromaDB store to /tmp as well (it also needs write access)
if [ -d "chroma_store" ]; then
    echo "Copying ChromaDB store to /tmp..."
    cp -r chroma_store /tmp/chroma_store
    export CHROMA_PERSIST_DIR="/tmp/chroma_store"
    echo "ChromaDB store copied successfully"
else
    echo "WARNING: chroma_store not found, will build fresh index"
    mkdir -p /tmp/chroma_store
    export CHROMA_PERSIST_DIR="/tmp/chroma_store"
    
    # Build the index if it doesn't exist
    echo "Building ChromaDB index..."
    python -m agent.build_index
fi

echo "=== Starting uvicorn server ==="
exec uvicorn api.main:app --host 0.0.0.0 --port $PORT
