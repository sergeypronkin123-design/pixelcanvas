# PixelCanvas — Own the Grid

A shared online pixel canvas where users can buy pixel blocks, create art, and trade territory in real time.

## Architecture

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: FastAPI (Python) + SQLAlchemy
- **Database**: PostgreSQL
- **Payments**: Stripe Checkout + Webhooks
- **Realtime**: WebSocket (native FastAPI)

## Features

- Full-screen interactive canvas with zoom, pan, grid rendering
- Block purchase system with dynamic pricing (location + scarcity)
- Pixel-level drawing inside owned blocks
- Real-time updates via WebSocket (purchases + drawings)
- Secondary marketplace for resale with platform fees
- Stripe payment integration with webhook verification
- Block reservation system with automatic expiry
- User authentication with JWT
- Admin panel with stats, users, orders, transactions
- Responsive dark-mode UI with premium design

## Project Structure

```
pixelcanvas/
├── backend/
│   ├── app/
│   │   ├── api/          # Route handlers
│   │   ├── core/         # Config, DB, security
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Business logic
│   ├── migrations/       # Alembic migrations
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom hooks
│   │   ├── lib/          # API client
│   │   ├── pages/        # Page components
│   │   ├── stores/       # Zustand stores
│   │   ├── styles/       # Global CSS
│   │   └── types/        # TypeScript types
│   ├── package.json
│   └── .env.example
├── README.md
└── DEPLOY.md
```

## Local Development

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials and Stripe keys

# Start the server (auto-creates tables and initializes canvas)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will:
1. Create all database tables
2. Initialize canvas blocks (default 100x100 = 10,000 blocks)
3. Create an admin user from env vars
4. Start background reservation cleanup task

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Start dev server (proxies API to localhost:8000)
npm run dev
```

Open http://localhost:5173

### Stripe Setup (for payments)

1. Create a Stripe account at https://stripe.com
2. Get your test API keys from the Stripe Dashboard
3. Set `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` in backend `.env`
4. For webhooks, use Stripe CLI in development:
   ```bash
   stripe listen --forward-to localhost:8000/api/purchase/webhook
   ```
5. Set the webhook signing secret as `STRIPE_WEBHOOK_SECRET`

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in
- `GET /api/auth/me` — Get current user

### Canvas
- `GET /api/blocks/canvas` — Get blocks in viewport
- `GET /api/blocks/{id}` — Get block details
- `GET /api/blocks/at/{x}/{y}` — Get block at position
- `GET /api/blocks/owned/me` — Get user's blocks

### Pixels
- `GET /api/pixels/region` — Get pixels in viewport
- `GET /api/pixels/block/{id}` — Get block's pixel data
- `POST /api/pixels/draw` — Draw pixels (ownership validated)

### Purchase
- `POST /api/purchase/checkout` — Start primary purchase
- `POST /api/purchase/checkout/resale` — Start resale purchase
- `POST /api/purchase/webhook` — Stripe webhook endpoint
- `GET /api/purchase/orders` — Get user's orders

### Marketplace
- `GET /api/marketplace/listings` — Browse listings
- `POST /api/marketplace/list` — List block for sale
- `DELETE /api/marketplace/delist/{id}` — Cancel listing
- `GET /api/marketplace/my-listings` — Get user's listings

### Admin
- `GET /api/admin/stats` — Platform statistics
- `GET /api/admin/users` — List users
- `GET /api/admin/orders` — List orders
- `GET /api/admin/transactions` — List transactions

### Realtime
- `WS /ws` — WebSocket for live updates

## Purchase Flow

1. User clicks available block → frontend requests checkout
2. Backend validates block is free → reserves block → creates pending order
3. Backend creates Stripe Checkout Session → returns URL
4. User redirected to Stripe Checkout → pays
5. Stripe sends webhook to backend → signature verified
6. Backend marks order paid → assigns ownership → removes reservation
7. WebSocket broadcasts block update to all clients
8. Expired reservations are cleaned up every 60 seconds

## Security

- Passwords hashed with bcrypt
- JWT authentication on protected endpoints
- Stripe webhook signature verification
- Server-side price verification (never trust frontend)
- Ownership validation before drawing
- Race condition protection with `SELECT ... FOR UPDATE`
- Idempotent webhook processing via webhook_events table
- CORS configured for frontend origin only
- Input validation via Pydantic schemas
