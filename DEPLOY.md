# Deployment Guide

Deploy PixelCanvas to production with Neon (database), Render (backend), and Netlify (frontend).

---

## 1. Database — Neon Postgres

1. Create an account at https://neon.tech
2. Create a new project (choose the region closest to your Render server)
3. Copy the connection string, it looks like:
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/pixelcanvas?sslmode=require
   ```
4. Save this — you'll use it as `DATABASE_URL` in the backend config

---

## 2. Backend — Render

### Create a Web Service

1. Go to https://render.com and create a new **Web Service**
2. Connect your GitHub repo or upload the code
3. Configure:
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Environment Variables

Set these in Render's Environment tab:

```
DATABASE_URL=postgresql://...@neon.tech/pixelcanvas?sslmode=require
SECRET_KEY=<generate-a-strong-random-string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

FRONTEND_URL=https://your-app.netlify.app
BACKEND_URL=https://your-backend.onrender.com
ENVIRONMENT=production

CANVAS_WIDTH=1000
CANVAS_HEIGHT=1000
BLOCK_SIZE=10
BASE_BLOCK_PRICE=100
CURRENCY=usd
RESALE_FEE_PERCENT=5
RESERVATION_TIMEOUT_SECONDS=600

ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=<strong-password>
```

### Notes
- The backend auto-creates tables and initializes canvas on first start
- First deploy will take a few minutes as 10,000 blocks are created
- Render free tier sleeps after inactivity — use paid plan for production

---

## 3. Frontend — Netlify

### Build & Deploy

1. Go to https://app.netlify.com and create a new site
2. Connect your repo or drag-and-drop the `frontend` folder
3. Configure build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`

### Environment Variables

Set in Netlify's Environment Variables section:

```
VITE_API_URL=https://your-backend.onrender.com
VITE_WS_URL=wss://your-backend.onrender.com/ws
```

### Redirects for SPA

Create `frontend/public/_redirects`:
```
/*    /index.html   200
```

This ensures client-side routing works.

---

## 4. Stripe Webhook Setup

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click **Add endpoint**
3. Set endpoint URL: `https://your-backend.onrender.com/api/purchase/webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `checkout.session.expired`
5. Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET` in Render

### Testing Webhooks

Use Stripe CLI to forward webhooks to your local backend during development:
```bash
stripe listen --forward-to localhost:8000/api/purchase/webhook
```

---

## 5. Post-Deployment Checklist

- [ ] Backend health check: `GET https://your-backend.onrender.com/api/health`
- [ ] Frontend loads at your Netlify URL
- [ ] Registration and login work
- [ ] Canvas loads with blocks visible
- [ ] Block click shows info panel
- [ ] Stripe checkout redirects correctly
- [ ] Webhook processes payments (check Stripe dashboard for delivery status)
- [ ] WebSocket connects (check browser console for "WebSocket connected")
- [ ] Drawing works on owned blocks
- [ ] Marketplace listings show up
- [ ] Admin panel accessible for admin user

---

## 6. Custom Domain (Optional)

### Netlify
1. Go to Site settings → Domain management → Add custom domain
2. Configure DNS as instructed

### Render
1. Go to your service → Settings → Custom Domains
2. Add domain and configure DNS

### Update CORS
After adding custom domains, update `FRONTEND_URL` in Render env vars to match your custom domain.

---

## Scaling Notes

- **Database**: Neon auto-scales. For heavy traffic, consider connection pooling.
- **Backend**: Render can scale horizontally. WebSocket connections need sticky sessions or switch to Redis PubSub for multi-instance.
- **Canvas Size**: Default 1000x1000 = 10,000 blocks. Adjust `CANVAS_WIDTH`, `CANVAS_HEIGHT`, and `BLOCK_SIZE` in env vars. Larger canvases need initial setup time.
- **Redis**: For multi-instance WebSocket support, add Redis PubSub. Set `REDIS_URL` and update the connection manager to use Redis channels.
