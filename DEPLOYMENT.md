# 🚀 Deployment Guide

This guide will help you deploy your Text-to-SQL application to GitHub and set it up on a new machine.

---

## 📤 Pushing to GitHub

### 1. Verify Security

Before pushing, always verify that sensitive files are properly ignored:

```bash
# Check git status - .env should NOT appear here
git status

# Verify .env is ignored
git check-ignore -v .env
# Should output: .gitignore:1:.env    .env

# Check what will be committed
git diff --cached
```

### 2. Push Your Code

```bash
# Push to GitHub
git push origin main
```

### 3. Verify on GitHub

Go to your repository on GitHub and verify:
- ✅ `.env` file is NOT present
- ✅ `.env.example` IS present
- ✅ `data/raw/*.csv` files are NOT present (they're too large)
- ✅ `chroma_store/` is NOT present
- ✅ `*.db` files are NOT present

---

## 🔽 Setting Up on a New Machine

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/text-to-sql.git
cd text-to-sql
```

### 2. Set Up Python Environment

```bash
# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your Google Gemini API key
# Get a free key at: https://aistudio.google.com/app/apikey
nano .env  # or use your favorite editor
```

Your `.env` should look like:
```bash
GOOGLE_API_KEY=your_actual_api_key_here
GEMINI_MODEL=gemini-flash-latest
DATABASE_URL=sqlite:///./data/olist.db
CHROMA_PERSIST_DIR=./chroma_store
LOG_LEVEL=INFO
ALLOWED_ORIGINS=*
```

### 4. Download and Seed the Database

```bash
# Download the Olist dataset from Kaggle
# https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce
# Extract CSV files to data/raw/

# Seed the database
python -m data.seed
```

### 5. Build the Vector Index

```bash
# This creates embeddings for the database schema
python -m agent.build_index
```

### 6. Start the Backend Server

```bash
uvicorn api.main:app --reload --port 8000
```

### 7. Set Up and Start the Frontend

```bash
# In a new terminal
cd frontend
npm install
npm run dev
```

### 8. Access the Application

Open your browser and go to: **http://localhost:5173**

---

## 🌐 Production Deployment

### Environment Variables for Production

Update these in your `.env` for production:

```bash
# Set specific allowed origins (not *)
ALLOWED_ORIGINS=https://yourdomain.com

# Use INFO or WARNING for production
LOG_LEVEL=WARNING

# Consider using PostgreSQL instead of SQLite
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### Using Docker (Optional)

Create a `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Build vector index on container start
RUN python -m agent.build_index

EXPOSE 8000

CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t text-to-sql .
docker run -p 8000:8000 --env-file .env text-to-sql
```

### Deployment Platforms

This application can be deployed to:

- **Railway.app** - Easy Python + Node.js deployment
- **Render.com** - Free tier available
- **Fly.io** - Good for global deployment
- **AWS EC2** - Full control (see `infra/` folder for scripts)
- **Google Cloud Run** - Serverless containers
- **Heroku** - Simple git push deployment

---

## 🔒 Security Checklist

Before deploying to production:

- [ ] `.env` is in `.gitignore` and not committed
- [ ] API keys are stored securely (environment variables, not hardcoded)
- [ ] `ALLOWED_ORIGINS` is set to your specific domain (not `*`)
- [ ] Database has proper access controls
- [ ] HTTPS is enabled
- [ ] Rate limiting is configured
- [ ] SQL injection protections are in place (already built-in)
- [ ] HITL guard is enabled for write operations (already built-in)

---

## 🆘 Troubleshooting

### "GOOGLE_API_KEY is not set"
- Make sure you copied `.env.example` to `.env`
- Make sure you added your actual API key to `.env`
- Restart the server after updating `.env`

### "ChromaDB collection not found"
- Run `python -m agent.build_index` to create the vector index

### "No such table: fact_orders"
- Run `python -m data.seed` to populate the database

### "Port 8000 already in use"
- Kill the existing process: `lsof -ti:8000 | xargs kill -9`
- Or use a different port: `uvicorn api.main:app --port 8001`

### Frontend can't connect to backend
- Make sure backend is running on port 8000
- Check CORS settings in `.env` (`ALLOWED_ORIGINS=*` for local dev)
- Verify `api.ts` points to `http://localhost:8000`

---

## 📝 Notes

- The vector index (`chroma_store/`) is not committed to Git
- You must rebuild it on each new deployment
- The database file (`data/olist.db`) is not committed
- You must seed it on each new deployment
- CSV files are large (~100MB) and not committed
- Download them separately from Kaggle

---

**Happy Deploying! 🎉**
