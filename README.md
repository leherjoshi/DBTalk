# 🧠 DBTalk — Natural Language to SQL

Type a question the way you'd ask a colleague. Receive a working SQL statement and live results pulled straight from the database. No SQL background needed.

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-orange.svg)](https://ai.google.dev/)

> **Who this is for:** You don't need any background in large language models or vector search to follow along.

---

## Project Overview

DBTalk is a natural language to SQL query engine powered by Google Gemini AI. Ask questions in plain English and get instant SQL queries with live results from your database.

**Key Features:**
- No dependency on OpenAI — the entire pipeline runs on Google Gemini
- Cost-friendly — Gemini's free tier covers typical development and testing usage
- Feature-complete — advanced RAG pipeline with semantic search
- Minimal configuration — a single free API key from [Google AI Studio](https://aistudio.google.com/app/apikey) is all that's required

| Component | Technology |
|---|---|
| Language model | Google Gemini (`gemini-flash-latest`) |
| Embeddings | Google Gemini (`gemini-embedding-001`) |
| Vector Store | ChromaDB |
| Database | SQLite / PostgreSQL |

---

## Contents

1. [Project Overview](#project-overview)
2. [Purpose of This Project](#purpose-of-this-project)
3. [Why Naive Prompting Fails at Scale](#why-naive-prompting-fails-at-scale)
4. [Design Approach](#design-approach)
5. [UI Features](#ui-features)
6. [Architecture Overview](#architecture-overview)
7. [Anatomy of a Query](#anatomy-of-a-query)
8. [Scope and Boundaries](#scope-and-boundaries)
9. [Repository Layout](#repository-layout)
10. [Data Model](#data-model)
11. [Getting Started](#getting-started)
12. [Configuration Reference](#configuration-reference)
13. [Deployment](#deployment)
14. [License](#license)

---

## Purpose of This Project

A non-technical user can type something like:

> "What are the top 10 product categories by revenue this year?"

and the system will:

1. Identify which database tables the question actually touches.
2. Ask Google Gemini to draft the matching SQL statement.
3. Run that statement against a live database (the Olist Brazilian e-commerce dataset).
4. Display the results as a clean, readable table.

The database itself is organized as a star schema built from the [Olist public dataset](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce) — real order, product, seller, customer, and review data from Brazilian e-commerce transactions.

---

## Why Naive Prompting Fails at Scale

A common first instinct when building text-to-SQL is to dump the entire database schema into the prompt and let the model figure it out. That works for a handful of tables, but it collapses under real-world conditions:

| Issue | Root Cause |
|---|---|
| **Prompt exceeds context limits** | Production warehouses often have 50–200 tables. Listing every table, column, type, and foreign key can blow past even a 128k-token context window. |
| **Signal gets buried in noise** | Even when everything technically fits, an oversized prompt full of irrelevant tables makes the model more likely to pick the wrong join or column. |
| **Intent isn't captured by names alone** | A column like `order_total_usd` doesn't explain itself. Is it summed or averaged? Does it need a status filter first? Raw schema metadata can't answer that. |
| **The model fabricates structure** | Starved of context, the LLM will invent plausible-sounding tables or columns that don't actually exist, producing SQL that fails at execution. |
| **No protection against destructive queries** | Without a safeguard, an ambiguous question could trigger a generated `DELETE` or `DROP TABLE` with nothing to stop it from running. |

This project was built specifically to close these gaps.

---

## Design Approach

Rather than shipping the full schema on every call, four techniques work together to keep prompts small, relevant, and safe.

### 1. A Semantic Layer

Every table and column carries a plain-language description in [`agent/semantic_layer.py`](agent/semantic_layer.py), explaining not just what a field is, but how it should be used. Example:

```
order_total_usd: "Final post-tax revenue in USD for this line item.
                  Always use this for GMV calculations.
                  Never use freight_value_usd as a revenue proxy."
```

This functions as a data dictionary the model consults before writing a single line of SQL.

### 2. Retrieval-Augmented Generation (RAG)

Instead of sending every table description in every request:

1. **On startup**, each table's description is converted into a vector using Gemini's embedding model (`gemini-embedding-001`) and stored in ChromaDB.
2. **At query time**, the incoming question is embedded the same way, and the three closest-matching table descriptions are pulled via cosine similarity and inserted into the prompt.

A question about "revenue by category" surfaces `fact_orders` and `dim_products` — nothing else — keeping the model focused and the resulting SQL accurate.

### 3. Curated Few-Shot Examples

A set of hand-picked question-to-SQL pairs lives in [`agent/few_shot_examples.yaml`](agent/few_shot_examples.yaml). These act as worked examples, showing the model the exact dialect, join conventions, and aggregation patterns this particular database expects.

### 4. Human-in-the-Loop Safety Check

Every generated statement is scanned before execution. If keywords like `INSERT`, `UPDATE`, `DELETE`, or `DROP` appear, the query is held and the user must actively confirm through a modal dialog before it runs. Read-only `SELECT` statements skip this step and execute immediately.

---

## UI Features

Beyond the core pipeline, the frontend includes a set of quality-of-life features aimed at making everyday use faster and more comfortable.

### Export Results

Results don't have to stay trapped in the browser. From the results table header, you can:

- Export the current result set to CSV or JSON
- Copy results directly to the clipboard
- Download the generated SQL query as a standalone file

### Query History

Every query you run is tracked automatically, so you never have to retype something you already asked.

- The last 50 queries are saved automatically
- Star any query to mark it as a favorite
- Filter the history view between all queries and favorites only
- Click any past entry to re-run it instantly
- History persists locally in the browser via `localStorage`, so it survives page reloads

### Dark / Light Mode

A toggle in the toolbar switches between dark and light themes, with the transition animated for a smoother feel. Your preference is remembered between sessions, and both palettes are built with accessible contrast in mind.

### Query Suggestions

New users don't have to guess what to ask. When the results area is empty, the app surfaces 24 ready-to-run example queries grouped into six categories — Revenue, Customers, Products, Orders, Sellers, and Reviews. Clicking any suggestion runs it immediately.

### Frontend additions

These features are implemented as four new components, documented in full in [`FEATURES.md`](FEATURES.md):

- `ExportButton.tsx` — handles CSV/JSON export, clipboard copy, and SQL download
- `QueryHistory.tsx` — manages the history list, favorites, and filtering
- `QuerySuggestions.tsx` — renders the categorized example-query gallery
- `ThemeToggle.tsx` — controls dark/light mode switching and persistence

The toolbar itself has also been updated with dedicated History and Theme buttons, along with a "Powered by Google Gemini" badge.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (React)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  ChatWindow  │  │  SqlDisplay  │  │   ResultsTable    │  │
│  │ (ask a Q)    │  │ (show SQL)   │  │ (show rows)       │  │
│  └──────┬───────┘  └──────────────┘  └───────────────────┘  │
│         │ POST /query                                        │
└─────────┼──────────────────────────────────────────────────┘
          │
┌─────────▼──────────────────────────────────────────────────┐
│                    FastAPI Backend (Python)                  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                sql_chain.py (LCEL pipeline)           │   │
│  │                                                        │   │
│  │  Question                                              │   │
│  │     │                                                  │   │
│  │     ▼                                                  │   │
│  │  [1] retriever.py ──► ChromaDB (vector store)          │   │
│  │     │   (embed question, find top-3 relevant tables)   │   │
│  │     ▼                                                  │   │
│  │  [2] Load few_shot_examples.yaml                       │   │
│  │     │                                                  │   │
│  │     ▼                                                  │   │
│  │  [3] Build ChatPromptTemplate                          │   │
│  │     │   (schema + examples + question)                 │   │
│  │     ▼                                                  │   │
│  │  [4] Google Gemini (temperature=0) ◄── Gemini API      │   │
│  │     │   (generate SQL)                                 │   │
│  │     ▼                                                  │   │
│  │  [5] hitl_guard.py                                     │   │
│  │     │   (block writes, require human approval)         │   │
│  │     ▼                                                  │   │
│  │  [6] Execute SQL ──► SQLite / PostgreSQL                │   │
│  │     │                                                  │   │
│  │     ▼                                                  │   │
│  │  [7] Log to query_log table                            │   │
│  │     │                                                  │   │
│  │     ▼                                                  │   │
│  │  Return {sql, results, latency_ms}                     │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
          │
┌─────────▼────────────────────────────┐
│         ChromaDB (vector store)       │
│  Table descriptions stored as vectors │
│  Persisted to ./chroma_store/         │
└──────────────────────────────────────┘
          │
┌─────────▼────────────────────────────┐
│     SQLite (./data/olist.db)          │
│  fact_orders, dim_users,              │
│  dim_products, dim_sellers,           │
│  dim_geography, dim_reviews,          │
│  query_log                            │
└──────────────────────────────────────┘
```

---

## Anatomy of a Query

Here's what happens, end to end, when someone submits: *"Which states have the most canceled orders?"*

1. **Question is embedded.** The text is turned into a vector via Gemini's `gemini-embedding-001` model.
2. **Relevant tables are retrieved.** ChromaDB compares that vector against every stored table description and surfaces the closest matches — here, `fact_orders` (holds `order_status`) and `dim_users` (holds `state`).
3. **A prompt is assembled.** A `ChatPromptTemplate` combines a system message (the retrieved schema plus few-shot examples) with the user's actual question.
4. **Gemini generates SQL.** The prompt goes to `gemini-flash-latest` at `temperature=0` for consistent, repeatable output, and the model returns a raw SQL string.
5. **Output is sanitized.** A lightweight regex pass removes markdown fences or stray text the model might have added around the query.
6. **Safety check runs.** The statement is checked for destructive keywords. Since this is a `SELECT`, it proceeds without interruption.
7. **Query executes.** The statement runs against SQLite, with an automatic `LIMIT 1000` applied if one isn't already present.
8. **Everything gets logged.** The question, generated SQL, execution time, and tables involved are recorded in `query_log`, and the API responds with `{sql, results, latency_ms}`.
9. **Results render.** The frontend shows the SQL in a highlighted code block and the output as a paginated table.

---

## Scope and Boundaries

### Handles well

- Open-ended analytical questions about the Olist dataset, asked in everyday language
- Revenue breakdowns: totals, by category, seller, month, or state
- Customer insights: membership activity, geography, top spenders, cohort behavior
- Seller insights: rankings, geographic spread, freight costs
- Order patterns: status distribution, cancellation rates, trends over time
- Review and satisfaction metrics: average scores by category, complaint frequency
- Advanced SQL constructs: multi-table joins, CTEs, window functions
- Explaining its own generated query
- Halting destructive operations pending explicit human sign-off
- Exporting results to CSV/JSON, copying to clipboard, or downloading the SQL used
- Recalling and re-running past queries, with favoriting and filtering
- Switching between dark and light themes with saved preference
- Getting started quickly via 24 categorized example queries

### Out of scope

- Writing to the database (`INSERT`/`UPDATE`/`DELETE`) without going through the approval modal
- Reaching outside the defined semantic schema to query unlisted tables or columns
- Answering questions unrelated to the Olist dataset (real-time stock quotes, for instance)
- Guaranteeing flawless SQL every time — model output is inherently probabilistic, so generated queries should always be reviewed before the results are trusted

---

## Repository Layout

```
DBTalk/
│
├── agent/                      # Core AI pipeline
│   ├── sql_chain.py            # Main LCEL pipeline: question → SQL → results
│   ├── retriever.py            # RAG: embed question, query ChromaDB
│   ├── semantic_layer.py       # Business descriptions for every table/column
│   ├── build_index.py          # One-time script: embed schema into ChromaDB
│   ├── hitl_guard.py           # Safety: block write SQL, require human approval
│   └── few_shot_examples.yaml  # Curated Q→SQL examples for in-context learning
│
├── api/                        # FastAPI web server
│   ├── main.py                 # App factory, CORS, error handling
│   └── routes/
│       ├── query.py            # POST /query — runs the full pipeline
│       ├── schema.py           # GET /schema — returns table descriptions
│       └── health.py           # GET /health — liveness check
│
├── model/                      # SQLAlchemy ORM models
│   ├── database.py             # Engine + session factory
│   └── schema.py               # Table definitions (star schema + query_log)
│
├── frontend/                   # React + TypeScript UI
│   └── src/
│       ├── App.tsx             # Root component
│       ├── api.ts              # HTTP client
│       └── components/
│           ├── ChatWindow.tsx        # Question input box
│           ├── SqlDisplay.tsx        # Syntax-highlighted SQL output
│           ├── ResultsTable.tsx      # Pageable results grid
│           ├── SchemaExplorer.tsx    # Browse available tables/columns
│           ├── ApprovalModal.tsx     # HITL confirmation dialog
│           ├── ExportButton.tsx      # CSV/JSON export, clipboard copy, SQL download
│           ├── QueryHistory.tsx      # Auto-saved history with favorites and filtering
│           ├── QuerySuggestions.tsx  # Categorized example queries for the empty state
│           └── ThemeToggle.tsx       # Dark/light mode switcher
│
├── data/
│   ├── raw/                    # Raw Olist CSV files
│   └── seed.py                 # Load CSVs → SQLite (run once)
│
├── infra/                      # Deployment scripts (Linux/nginx/systemd)
│
├── requirements.txt            # Python dependencies
├── FEATURES.md                 # Full documentation of the UI feature set
├── DEPLOY.md                   # Deployment instructions for various platforms
├── LICENSE                     # MIT License
└── .env.example                # Copy to .env and fill in your keys
```

---

## Data Model

The database follows a star schema: a central fact table captures measurable business events, while surrounding dimension tables provide descriptive context.

```
                    ┌─────────────┐
                    │  dim_users  │
                    │  user_id PK │
                    │  city       │
                    │  state      │
                    └──────┬──────┘
                           │ FK
┌──────────────┐    ┌──────▼────────────┐    ┌───────────────┐
│ dim_products │    │   fact_orders     │    │  dim_sellers  │
│ product_id PK│◄───│   order_id PK     │───►│  seller_id PK │
│ category_name│    │   user_id FK      │    │  seller_city  │
│ photos_qty   │    │   product_id FK   │    │  seller_state │
└──────────────┘    │   seller_id FK    │    └───────────────┘
                    │   order_total_usd │
                    │   order_status    │    ┌───────────────┐
                    │   created_at      │───►│  dim_reviews  │
                    └───────────────────┘    │  review_id PK │
                                              │  order_id FK  │
                    ┌───────────────────┐    │  review_score │
                    │  dim_geography    │    └───────────────┘
                    │  geo_id PK        │
                    │  zip_code_prefix  │
                    │  city, state      │
                    │  lat, lng         │
                    └───────────────────┘
```

---

## Getting Started

### Before you begin, you'll need

- Python 3.11 or newer
- Node.js 18 or newer
- A Google Gemini API key — free to obtain at [Google AI Studio](https://aistudio.google.com/app/apikey)

### 1. Clone and install Python packages

```bash
# Clone the repository
cd text-to-sql
pip install -r requirements.txt
```

### 2. Set up your environment file

```bash
cp .env.example .env
# Open .env and add your GOOGLE_API_KEY
```

### 3. Load the dataset

Download the Olist CSVs into `data/raw/` (see the Kaggle link under [Purpose of This Project](#purpose-of-this-project)), then run:

```bash
python -m data.seed
```

### 4. Generate the vector index

This step embeds every table description into ChromaDB. Run it once initially, and again any time `semantic_layer.py` changes:

```bash
python -m agent.build_index
```

### 5. Launch the backend

```bash
uvicorn api.main:app --reload --port 8000
```

### 6. Launch the frontend

```bash
cd frontend
npm install
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) to start querying.

---

## Configuration Reference

| Variable | Default | Purpose |
|---|---|---|
| `GOOGLE_API_KEY` | *(required)* | Your Gemini API key, obtained free from [Google AI Studio](https://aistudio.google.com/app/apikey). |
| `GEMINI_MODEL` | `gemini-flash-latest` | Chat model used for SQL generation. Alternatives: `gemini-flash-latest`, `gemini-2.0-flash`, `gemini-pro-latest`. |
| `DATABASE_URL` | `sqlite:///./data/olist.db` | SQLAlchemy connection string; swap in a `postgresql://...` URL for Postgres. |
| `CHROMA_PERSIST_DIR` | `./chroma_store` | Where ChromaDB stores its vector index on disk. |
| `LOG_LEVEL` | `INFO` | Python logging verbosity (`DEBUG`, `INFO`, `WARNING`, `ERROR`). |
| `ALLOWED_ORIGINS` | `*` | Comma-separated list of allowed CORS origins; restrict this in production. |

**Note:** The current build relies entirely on Google Gemini for both embeddings (`gemini-embedding-001`) and chat generation.

---

## Deployment

Ready to take DBTalk to production? The full walkthrough lives in [`DEPLOY.md`](DEPLOY.md), covering:

- **Railway.app** — recommended; free tier, easiest setup
- **Render.com** — free tier with SSL included
- **Vercel + Railway** — best performance combination
- **Fly.io** — global edge deployment
- **AWS EC2** — production-grade, self-managed

### Quickest path

Railway or Render are the fastest routes to a live deployment — both offer free tiers well-suited to testing and demos.

---

## License

Released under the MIT License — free to use, modify, and build on for learning or production projects. See [`LICENSE`](LICENSE) for the full text.
