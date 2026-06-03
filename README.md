# QuantLedger

> **A full-stack quantitative portfolio management platform** — real-time P&L tracking, quant-grade risk analytics, and AI-driven wealth advisory, all in one unified system.

---

## Table of Contents

1. [Overview](#overview)
2. [Live Architecture](#live-architecture)
3. [Feature Breakdown](#feature-breakdown)
4. [Technical Deep-Dive](#technical-deep-dive)
  - [Backend](#backend--fastapi--sqlalchemy)
  - [Quantitative Engine](#quantitative-engine)
  - [Investment Recommender](#investment-recommender)
  - [Market Analysis Engine](#market-analysis-engine)
  - [Authentication & Security](#authentication--security)
  - [Background Scheduler](#background-scheduler)
  - [Frontend](#frontend--react--vite)
5. [Data Model](#data-model)
6. [API Reference](#api-reference)
7. [Tech Stack](#tech-stack)
8. [Getting Started](#getting-started)
9. [Configuration](#configuration)
10. [Roadmap](#roadmap)

---

## Overview

QuantLedger is a **production-ready personal finance platform** targeting both retail investors and finance-literate users who want institutional-grade portfolio intelligence without brokerage lock-in.

It aggregates **heterogeneous asset classes** — equities, mutual funds, ETFs, REITs, crypto, fixed deposits, government bonds, PPF, SCSS, real estate, private equity — under a single authenticated ledger. Live market prices are fetched via Yahoo Finance and cached with a background refresh cycle to minimize API latency on hot paths.

The system exposes a **typed REST API** (FastAPI + Pydantic v2) consumed by a **React 19 SPA** that renders real-time Recharts visualisations, a cross-asset sensitivity matrix, and a rule-based wealth advisory scoreboard with SIP/lump-sum projection bands.

---

## Live Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React SPA (Vite)                     │
│  Auth · Dashboard · Advisor · Analysis · Profile            │
│  Axios interceptors attach JWT Bearer on every request      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS / REST
┌────────────────────────▼─────────────────────────────────────┐
│                  FastAPI (Uvicorn ASGI)                      │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐    │
│  │  /auth   │  │/portfolio │  │ /advisor  │  │/analyze  │    │
│  └──────────┘  └───────────┘  └───────────┘  └──────────┘    │
│         │             │              │               │       │
│  ┌──────▼─────────────▼──────────────▼───────────────▼────┐  │
│  │              SQLAlchemy ORM  ←→  SQLite / Postgres     │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐│
│  │      APScheduler (background)  →  yfinance price sync    ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
                         │
           ┌─────────────▼──────────────┐
           │   Yahoo Finance API        │
           │   (OHLCV, search, quotes)  │
           └────────────────────────────┘
```

---

## Feature Breakdown

### Portfolio Dashboard

- Tracks **14 distinct asset classes** across 3 macro groups (Fixed Income, Market-Linked, Physical/Alternatives).
- Calculates **real-time P&L** per holding and portfolio-wide, with colour-coded percentage changes.
- Dynamic **donut chart** (Recharts `PieChart`) showing capital allocation by asset.
- **Smart asset search** — proxied through Yahoo Finance's `/v1/finance/search` endpoint with custom disambiguation hints for confusable Indian tickers (e.g., `HDFC.NS` vs `HDFCBANK.NS`, `M&M.NS` vs `MM`).
- **Three data-entry modes**:

  | Mode       | Mechanism                                                    |
  | ---------- | ------------------------------------------------------------ |
  | Manual     | Per-asset form with context-sensitive fields per asset type  |
  | PAN Sync   | NSDL/CDSL integration stub — imports equities and PPF by PAN |
  | MF Central | OTP-based two-step mobile sync stub for mutual fund folios   |


### Market Analysis Engine

- Compare up to **5 tickers simultaneously** across configurable periods (1M → 5Y).
- Two chart modes: **Absolute price** (₹) and **Indexed/rebased to 100** for fair cross-asset comparison when price scales diverge by orders of magnitude.
- **Interactive time-zoom** via Recharts `Brush` component — drag to select a sub-window; ± zoom buttons narrow/expand the visible range by 35% / 45% increments.
- **Pairwise sensitivity (beta) matrix** — for each 1% move in asset A, how much does asset B tend to move? Computed from rolling covariance over the selected period.

### Wealth Advisor / Scoreboard

- Input: investment amount, time horizon (1–10 years or open-ended), SIP vs lump-sum flag.
- Engine classifies all known instruments into **3 ranked buckets** (Fixed Income, Market-Linked, Physical/Alternatives) each with calibrated return bands.
- **SIP projection** uses the standard future-value formula:
  ```
  FV = P × [((1 + r)^n − 1) / r] × (1 + r)
  ```
  where `r = annual_rate / 12`, `n = months`.
- **Lump-sum projection**: `FV = P × (1 + r)^years`.
- Each bucket receives a **suitability score (0–100)**, penalised when the horizon is shorter than the asset class's recommended minimum.
- Top 5 current-rate instruments are surfaced per category (SCSS 8.2%, HDFC FD 7.2%, Parag Parikh Flexi Cap CAGR proxy 13.2%, SGB 9.0%, etc.).

### User Profile & Auth

- JWT-authenticated profile with fields: full name, phone, occupation, risk appetite, avatar colour.
- Inline editing with live backend sync via `PUT /api/profile`.

---

## Technical Deep-Dive

### Backend — FastAPI + SQLAlchemy

The backend is a single **ASGI application** (`main.py`) built on FastAPI, chosen for:

- **Pydantic v2** request/response validation with zero boilerplate.
- **Async lifespan context manager** for clean scheduler startup/shutdown.
- **Dependency injection** (`Depends`) for session management and JWT guard — every protected route receives a `User` object injected by `get_current_user`, keeping route handlers clean of auth logic.
- **Configurable CORS** — origins loaded from environment; `*` wildcard is supported via env flag for containerised CI/CD environments.

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    job_scheduler.start()   # APScheduler starts before first request
    yield
    job_scheduler.shutdown()
```

Database sessions follow a **generator-based dependency** pattern ensuring the session is always closed even on exception:

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

### Quantitative Engine

**File:** `quant_engine.py`

For any ticker, the engine pulls 1 year of OHLCV data from Yahoo Finance and computes:


| Metric             | Formula                                              | Annualisation                               |
| ------------------ | ---------------------------------------------------- | ------------------------------------------- |
| **Volatility (σ)** | `std(daily_pct_returns)`                             | `× √252`                                    |
| **Sharpe Ratio**   | `(annualised_return − 0.04) / annualised_volatility` | Risk-free rate = 4% (10Y Indian Gsec proxy) |
| **Momentum 12M**   | `Close[-1] / Close[0] − 1`                           | Full-year price return                      |
| **Momentum 3M**    | `Close[-1] / Close[-63] − 1`                         | ≈ 63 trading days                           |


Results are **persisted to the `asset_metrics` table** on first computation and served from cache on subsequent requests — a read-through caching pattern that keeps the hot path at O(1) DB reads.

---

### Market Analysis Engine

**File:** `analysis_engine.py`

Multi-ticker comparison pipeline:

1. **Parallel data fetch** — one `yf.Ticker.history()` call per symbol.
2. **Timezone normalisation** — strips tz-awareness and floor-normalises to midnight to align trading calendars across exchanges (NSE, BSE, NYSE, NASDAQ).
3. **Forward-fill + dropna** — handles cross-exchange holiday gaps without introducing look-ahead bias.
4. **Pairwise beta matrix** — computed from the daily-returns covariance matrix:
  ```
   β(A→B) = Cov(A, B) / Var(A)
  ```
   This quantifies *directional co-movement* between any pair in the selection — useful for portfolio diversification analysis.

---

### Investment Recommender

**File:** `recommender.py`

A **rule-based scoring engine** with pluggable rate data. Design philosophy: stateless, pure functions — no ML model weights, fully explainable to any user.

- `fetch_non_market_rates()` — returns curated fixed-income benchmarks (designed to be swapped with a live bank-rate scraper).
- `fetch_market_linked_top5()` — representative trailing CAGR proxies for index funds and flexi-cap MFs.
- `_project_range(amount, rate_min, rate_max, years, is_monthly)` — returns a `(total_invested, projected_min, projected_max)` tuple for both SIP and lump-sum modes.
- Suitability scoring applies a **25-point penalty per year** when the user's horizon is shorter than the asset class minimum, and a **+15 bonus** for open-ended horizons on higher-risk buckets.

---

### Authentication & Security

**File:** `auth.py`


| Mechanism         | Implementation                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| Password hashing  | `passlib` bcrypt with automatic salt — no plain-text passwords ever stored                               |
| Token format      | HS256-signed JWT via `python-jose`                                                                       |
| Token claims      | `sub` (user email) + `exp` (configurable TTL, default 30 min)                                            |
| Guard             | `OAuth2PasswordBearer` dependency injected on every protected route                                      |
| Secret management | `SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` all read from environment — never hardcoded |


The JWT guard raises a structured 401 with a `WWW-Authenticate: Bearer` header on any invalid or expired token, conforming to RFC 6750.

---

### Background Scheduler

**File:** `scheduler.py`

An **APScheduler `BackgroundScheduler*`* refreshes market prices for all cached tickers every minute:

```python
job_scheduler.add_job(update_market_data, 'interval', minutes=1)
```

The job queries every row in `asset_metrics`, fetches the latest 1-day close price from Yahoo Finance, and persists it back — so portfolio P&L is always within 60 seconds of live. The scheduler is lifecycle-managed by FastAPI's `lifespan` context, guaranteeing clean shutdown without zombie threads.

---

### Frontend — React + Vite

**Tech:** React 19, React Router v7, Recharts 3, Axios, Vite 8

#### Routing & Auth Guard

```
/             → redirect to /login
/login        → Auth (unauthenticated)
/dashboard    → ProtectedLayout → Dashboard
/advisor      → ProtectedLayout → Advisor
/analysis     → ProtectedLayout → Analysis
/profile      → ProtectedLayout → Profile
```

`ProtectedLayout` checks `localStorage` for a JWT token and redirects to `/login` if absent — a client-side guard complementing the server-side JWT validation.

#### API Client (`api.js`)

A centralised Axios instance with a **request interceptor** that attaches `Authorization: Bearer <token>` from `localStorage` to every outgoing request. The API surface is grouped into typed modules:

```
authAPI      → login, register
portfolioAPI → getPortfolio, getCatalog, buyStock, deleteItem,
               searchAssets, syncPan, syncMfCentral
advisorAPI   → getPlan
analysisAPI  → compareStocks
profileAPI   → getProfile, updateProfile
```

#### Key React Patterns

- `**useMemo**` for expensive derivations (chart data series, field schema per asset type, asset type option list) — avoids recalculation on unrelated re-renders.
- `**useCallback**` for zoom handlers in the analysis chart — stable function references prevent unnecessary child re-renders.
- **Controlled search/autocomplete** with debounced live queries to `GET /api/search` — results scoped to the top 8 matches.
- **Dynamic form schema** — `TYPE_FIELD_SCHEMA` from the backend catalog drives which fields, labels, and input types appear per asset class, keeping the UI DRY across 14 asset types.

---

## Data Model

```
users
├── id (PK)
├── email (UNIQUE INDEX)
├── hashed_password
├── full_name
├── phone
├── occupation
├── risk_appetite   (default: "Moderate")
├── avatar_color    (default: "#c9a227")
└── created_at

portfolio_items
├── id (PK)
├── owner_id (FK → users.id)
├── ticker
├── quantity
├── average_buy_price
├── asset_type      (STOCK | MF | ETF | FD | RD | GOV_BOND | PPF |
│                    SCSS | CORP_BOND | ULIP | NPS | REAL_ESTATE |
│                    GOLD | REIT | CRYPTO | PE)
└── maturity_date   (nullable — for FD, RD, bonds)

asset_metrics
├── id (PK)
├── ticker (UNIQUE INDEX)
├── current_price   (nullable — populated by background job)
├── volatility      (annualised σ)
├── sharpe_ratio    (excess return / σ, rf = 4%)
├── momentum_12m    (12-month price return)
├── momentum_3m     (3-month price return)
└── last_updated
```

**Schema evolution strategy:** A lightweight `_ensure_user_profile_columns()` function introspects SQLite's `PRAGMA table_info` and issues `ALTER TABLE ... ADD COLUMN` statements for any missing profile columns — enabling zero-downtime schema migrations on SQLite without a full migration tool like Alembic.

---

## API Reference


| Method   | Endpoint                        | Auth | Description                                                 |
| -------- | ------------------------------- | ---- | ----------------------------------------------------------- |
| `GET`    | `/`                             | ✗    | Health check                                                |
| `POST`   | `/api/register`                 | ✗    | Create user account                                         |
| `POST`   | `/api/login`                    | ✗    | OAuth2 password flow → JWT                                  |
| `GET`    | `/api/profile`                  | ✓    | Fetch authenticated user profile                            |
| `PUT`    | `/api/profile`                  | ✓    | Partial profile update                                      |
| `GET`    | `/api/portfolio`                | ✓    | Full portfolio with live P&L per holding                    |
| `POST`   | `/api/portfolio`                | ✓    | Add holding (validates live price for market-linked assets) |
| `DELETE` | `/api/portfolio/{id}`           | ✓    | Remove holding                                              |
| `POST`   | `/api/portfolio/sync/pan`       | ✓    | PAN-based holdings import                                   |
| `POST`   | `/api/portfolio/sync/mfcentral` | ✓    | MF Central OTP import flow                                  |
| `GET`    | `/api/search?q=`                | ✗    | Yahoo Finance asset search with hints                       |
| `GET`    | `/api/metrics/{ticker}`         | ✗    | Quant metrics (read-through cache)                          |
| `POST`   | `/api/advisor`                  | ✗    | Wealth scoreboard with SIP/lump-sum projections             |
| `POST`   | `/api/analyze`                  | ✗    | Multi-ticker price comparison + beta matrix                 |
| `GET`    | `/api/investment-catalog`       | ✗    | Asset type taxonomy + per-type field schema                 |


---

## Tech Stack


| Layer             | Technology                       | Purpose                                            |
| ----------------- | -------------------------------- | -------------------------------------------------- |
| **API framework** | FastAPI 0.136                    | Async REST, auto-generated OpenAPI docs            |
| **ASGI server**   | Uvicorn 0.48                     | Production-ready async HTTP server                 |
| **ORM**           | SQLAlchemy 2.0                   | Declarative models, session management             |
| **Database**      | SQLite (dev) / PostgreSQL (prod) | Configurable via `DATABASE_URL`                    |
| **Auth**          | python-jose + passlib (bcrypt)   | JWT signing, password hashing                      |
| **Market data**   | yfinance 1.4                     | OHLCV, real-time quotes, search                    |
| **Numerical**     | NumPy 2.4 + Pandas 3.0           | Vectorised returns, covariance, rolling stats      |
| **Scheduler**     | APScheduler 3.11                 | Background market-data refresh                     |
| **Validation**    | Pydantic 2.13                    | Request/response schemas, strict typing            |
| **Frontend**      | React 19 + Vite 8                | Component SPA, fast HMR dev cycle                  |
| **Routing**       | React Router v7                  | Client-side SPA routing with guards                |
| **Charts**        | Recharts 3.8                     | PieChart (allocation), LineChart (analysis), Brush |
| **HTTP client**   | Axios 1.16                       | Interceptor-based auth injection                   |
| **Deployment**    | Procfile (Heroku/Render)         | `uvicorn main:app --host 0.0.0.0 --port $PORT`     |


---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+

### Backend

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/QuantLedger.git
cd QuantLedger

# 2. Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env: set SECRET_KEY, DATABASE_URL, CORS_ORIGINS

# 5. Run the API server
uvicorn main:app --reload --port 8000
```

The interactive API docs are available at **[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)**.

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Set VITE_API_BASE_URL=http://127.0.0.1:8000

# Start dev server
npm run dev
```

The SPA runs at **[http://localhost:5173](http://localhost:5173)**.

---

## Configuration


| Variable                      | Default                  | Description                                       |
| ----------------------------- | ------------------------ | ------------------------------------------------- |
| `SECRET_KEY`                  | *(required)*             | JWT signing key — use `openssl rand -hex 32`      |
| `JWT_ALGORITHM`               | `HS256`                  | HMAC algorithm for JWT                            |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30`                     | Token TTL                                         |
| `DATABASE_URL`                | `sqlite:///./finance.db` | SQLAlchemy connection string                      |
| `CORS_ORIGINS`                | `http://localhost:5173`  | Comma-separated allowed origins; `*` for wildcard |
| `VITE_API_BASE_URL`           | `http://127.0.0.1:8000`  | Backend base URL for the React SPA                |


---

## Roadmap

- **Alembic migrations** — replace the lightweight `ALTER TABLE` bootstrap with versioned schema migrations
- **Live NSDL/CDSL integration** — production PAN-based holdings sync via the actual depository API
- **MF Central API** — real OTP flow replacing the demo stub
- **Alpha Vantage / Finnhub fallback** — secondary price feed when Yahoo Finance rate-limits
- **LLM-powered advisor** — GPT-4 / Gemini narrative explanations for each investment recommendation
- **WebSocket live prices** — push-based price updates replacing the polling scheduler
- **Portfolio backtesting** — historical what-if analysis on held assets
- **Tax P&L export** — LTCG/STCG breakdown for Indian ITR filing

---

## Author

Built by **Sohini Banerjee** — Full-Stack Engineer with an interest on financial systems, quantitative analytics, and data-intensive web applications.

> *"Track every rupee. Understand every risk."*

