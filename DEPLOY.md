# 🚀 DBTalk Deployment Guide

This guide will help you deploy DBTalk to various platforms.

---

## 📋 Prerequisites

Before deploying, ensure you have:
- ✅ Code pushed to GitHub: https://github.com/leherjoshi/DBTalk
- ✅ Google Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- ✅ Olist dataset CSV files (download from [Kaggle](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce))

---

## 🌐 Deployment Options

### Option 1: Railway.app (Recommended - Easy & Free Tier)

**Pros:** Free tier, automatic deployments, easy setup
**Time:** ~10 minutes

#### Steps:

1. **Sign up at [Railway.app](https://railway.app/)**

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `leherjoshi/DBTalk`

3. **Add Environment Variables**
   ```
   GOOGLE_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-flash-latest
   DATABASE_URL=sqlite:///./data/olist.db
   CHROMA_PERSIST_DIR=./chroma_store
   LOG_LEVEL=INFO
   ALLOWED_ORIGINS=*
   PORT=8000
   ```

4. **Configure Build**
   - Add `Procfile` to your repo:
   ```
   web: uvicorn api.main:app --host 0.0.0.0 --port $PORT
   ```

5. **Deploy Backend**
   - Railway will auto-detect Python
   - It will install requirements.txt
   - Click "Deploy"

6. **Deploy Frontend Separately**
   - Create another service for frontend
   - Set build command: `cd frontend && npm install && npm run build`
   - Set start command: `cd frontend && npm run preview -- --host 0.0.0.0 --port $PORT`
   - Update frontend API URL to point to backend service

7. **Seed Database**
   - Upload CSV files to Railway volume
   - Run: `python -m data.seed`
   - Run: `python -m agent.build_index`

---

### Option 2: Render.com (Free Tier Available)

**Pros:** Free SSL, easy setup, PostgreSQL support
**Time:** ~15 minutes

#### Steps:

1. **Sign up at [Render.com](https://render.com/)**

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - Choose `leherjoshi/DBTalk`

3. **Configure Service**
   ```
   Name: dbtalk-backend
   Environment: Python 3
   Build Command: pip install -r requirements.txt && python -m agent.build_index
   Start Command: uvicorn api.main:app --host 0.0.0.0 --port $PORT
   ```

4. **Add Environment Variables** (same as Railway)

5. **Deploy Frontend**
   - Create another Web Service for frontend
   - Environment: Node
   - Build Command: `cd frontend && npm install && npm run build`
   - Start Command: `cd frontend && npm run preview -- --host 0.0.0.0 --port $PORT`

6. **Update CORS**
   - Update `ALLOWED_ORIGINS` to your frontend URL

---

### Option 3: Vercel (Frontend) + Railway (Backend)

**Pros:** Best performance for frontend, free tier
**Time:** ~20 minutes

#### Backend (Railway):
- Follow Railway steps above

#### Frontend (Vercel):

1. **Sign up at [Vercel.com](https://vercel.com/)**

2. **Import Project**
   - Click "New Project"
   - Import `leherjoshi/DBTalk`
   - Set Root Directory: `frontend`

3. **Configure Build**
   ```
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Environment Variables**
   ```
   VITE_API_URL=https://your-railway-backend.up.railway.app
   ```

5. **Update Frontend API**
   - Update `frontend/src/api.ts` to use `VITE_API_URL` env var:
   ```typescript
   const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
   ```

6. **Deploy**
   - Vercel will auto-deploy
   - Get your URL: `https://dbtalk.vercel.app`

---

### Option 4: Fly.io (Full Control)

**Pros:** Global edge deployment, Docker support
**Time:** ~30 minutes

#### Steps:

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Login**
   ```bash
   fly auth login
   ```

3. **Create Dockerfile** (in project root):
   ```dockerfile
   FROM python:3.11-slim
   
   WORKDIR /app
   
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt
   
   COPY . .
   
   RUN python -m agent.build_index
   
   EXPOSE 8000
   
   CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```

4. **Initialize Fly App**
   ```bash
   fly launch
   ```

5. **Set Secrets**
   ```bash
   fly secrets set GOOGLE_API_KEY=your_key_here
   fly secrets set GEMINI_MODEL=gemini-flash-latest
   ```

6. **Deploy**
   ```bash
   fly deploy
   ```

7. **Deploy Frontend**
   - Create separate app for frontend
   - Follow similar steps

---

### Option 5: AWS EC2 (Production)

**Pros:** Full control, scalable, professional
**Time:** ~1 hour
**Note:** Check existing scripts in `infra/` folder

#### Quick Steps:

1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t2.micro or larger
   - Open ports: 80, 443, 22

2. **SSH into Instance**
   ```bash
   ssh -i your-key.pem ubuntu@your-instance-ip
   ```

3. **Clone Repo**
   ```bash
   git clone https://github.com/leherjoshi/DBTalk.git
   cd DBTalk
   ```

4. **Run Setup Script**
   ```bash
   chmod +x infra/setup.sh
   sudo ./infra/setup.sh
   ```

5. **Configure Environment**
   ```bash
   cp .env.example .env
   nano .env  # Add your GOOGLE_API_KEY
   ```

6. **Install & Seed**
   ```bash
   pip install -r requirements.txt
   python -m data.seed
   python -m agent.build_index
   ```

7. **Setup Nginx**
   ```bash
   sudo cp infra/nginx.conf /etc/nginx/sites-available/dbtalk
   sudo ln -s /etc/nginx/sites-available/dbtalk /etc/nginx/sites-enabled/
   sudo systemctl restart nginx
   ```

8. **Setup Systemd Service**
   ```bash
   sudo cp infra/texttosql.service /etc/systemd/system/
   sudo systemctl enable texttosql
   sudo systemctl start texttosql
   ```

9. **Setup SSL (Optional)**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

---

## 🔧 Post-Deployment Checklist

After deployment, verify:

- [ ] Backend health check works: `https://your-url/health`
- [ ] Frontend loads correctly
- [ ] Query suggestions appear
- [ ] Can run a test query
- [ ] Export functionality works
- [ ] History saves queries
- [ ] Theme toggle works
- [ ] CORS is configured correctly
- [ ] SSL certificate is valid (if using HTTPS)

---

## 🐛 Troubleshooting

### Backend Issues:

**"GOOGLE_API_KEY not set"**
- Check environment variables are set correctly
- Restart the backend service

**"ChromaDB collection not found"**
- Run `python -m agent.build_index` on the deployed server
- Check CHROMA_PERSIST_DIR path is correct

**"Database not found"**
- Upload CSV files to server
- Run `python -m data.seed`
- Check DATABASE_URL path

### Frontend Issues:

**"Failed to fetch"**
- Check API_URL points to correct backend
- Verify CORS settings in backend .env
- Check network tab in browser dev tools

**"Mixed content error"**
- Ensure both frontend and backend use HTTPS
- Or both use HTTP (not mixed)

### Performance Issues:

**"Slow queries"**
- Check Gemini API quota/rate limits
- Consider using faster model
- Add caching layer (Redis)

**"Out of memory"**
- Increase instance size
- Optimize database queries
- Use PostgreSQL instead of SQLite

---

## 📊 Monitoring

### Logs:

**Railway/Render:**
- View logs in dashboard

**Fly.io:**
```bash
fly logs
```

**AWS EC2:**
```bash
sudo journalctl -u texttosql -f
```

### Metrics to Track:

- Response times
- Error rates
- API quota usage (Gemini)
- Database size
- Memory usage

---

## 💰 Cost Estimates

| Platform | Free Tier | Paid (Basic) | Best For |
|----------|-----------|--------------|----------|
| Railway | $5 credit/month | $5/month | Hobby projects |
| Render | 750 hrs/month | $7/month | Small apps |
| Vercel | Unlimited | $20/month | Frontends |
| Fly.io | Limited | $5-10/month | Global apps |
| AWS EC2 | 12 months | $10-30/month | Production |

**Gemini API:** Free tier available (60 requests/min)

---

## 🚀 Quick Deploy Commands

### Railway:
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Render:
```bash
# Push to GitHub (auto-deploys)
git push origin main
```

### Vercel:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

---

## 🎉 You're Live!

Once deployed, share your app:
- Update README with live URL
- Share on LinkedIn, Twitter
- Add to your portfolio
- Get feedback from users!

---

**Need Help?**
- Check `infra/TROUBLESHOOTING.md`
- Open an issue on GitHub
- Review platform-specific docs

**Good luck with your deployment! 🚀**
