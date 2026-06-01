import os
from datetime import date
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal, AssetMetric
from quant_engine import calculate_asset_metrics
from pydantic import BaseModel
from database import PortfolioItem
from auth import get_password_hash, verify_password, create_access_token
from database import User
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from auth import SECRET_KEY, ALGORITHM
from scheduler import job_scheduler
from fastapi.middleware.cors import CORSMiddleware
import requests
import yfinance as yf
from recommender import generate_scoreboard
from analysis_engine import generate_stock_comparison
from investment_catalog import (
    INVESTMENT_GROUPS,
    TYPE_FIELD_SCHEMA,
    MARKET_LINKED_TYPES,
    SYMBOL_HINTS,
)

class AnalysisRequest(BaseModel):
    tickers: list[str]  # e.g., ["AAPL", "MSFT"]
    period: str = "1y"  # Default to 1 year

class PortfolioItemCreate(BaseModel):
    ticker: str
    quantity: float
    average_buy_price: float
    asset_type: str = "STOCK"
    maturity_date: Optional[date] = None

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    occupation: Optional[str] = None
    risk_appetite: Optional[str] = None
    avatar_color: Optional[str] = None

class PanSyncRequest(BaseModel):
    pan: str

class MfCentralSyncRequest(BaseModel):
    mobile: str
    otp: Optional[str] = None

class AdvisorRequest(BaseModel):
    amount: float
    time_period: str # e.g., "5", "10", or "none"
    is_monthly: bool

class UserCreate(BaseModel):
    email: str
    password: str

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting background scheduler...")
    job_scheduler.start()
    yield
    print("Shutting down background scheduler...")
    job_scheduler.shutdown()

app = FastAPI(title="QuantLedger API", lifespan=lifespan)


_cors = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
allow_origins = ["*"] if _cors.strip() == "*" else [o.strip() for o in _cors.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
        
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
        
    return user

@app.get("/")
def health_check():
    return {"status": "System Online", "message": "Welcome to the Quant API"}

@app.get("/api/metrics/{ticker_symbol}")
def get_metrics(ticker_symbol: str, db: Session = Depends(get_db)):
    ticker_symbol = ticker_symbol.upper()
    db_metric = db.query(AssetMetric).filter(AssetMetric.ticker == ticker_symbol).first()

    if db_metric:
        return {
            "ticker": db_metric.ticker,
            "volatility": db_metric.volatility,
            "sharpe_ratio": db_metric.sharpe_ratio,
            "momentum_12m": db_metric.momentum_12m,
            "momentum_3m": db_metric.momentum_3m
        }
    else:
        try:
            metrics_data = calculate_asset_metrics(ticker_symbol)
        except Exception as e:
            raise HTTPException(status_code=404, detail=f"Ticker '{ticker_symbol}' not found or no data available.")
        
        new_metric_row = AssetMetric(
            ticker=ticker_symbol,
            volatility=metrics_data['volatility'],
            sharpe_ratio=metrics_data['sharp_ratio'],
            momentum_12m=metrics_data['momentum_12m'],
            momentum_3m=metrics_data['momentum_3m']
        )
        db.add(new_metric_row)
        db.commit()
        return {
            "ticker": ticker_symbol,
            "volatility": metrics_data['volatility'],
            "sharpe_ratio": metrics_data['sharp_ratio'],
            "momentum_12m": metrics_data['momentum_12m'],
            "momentum_3m": metrics_data['momentum_3m']
        }   

@app.post("/api/portfolio")
def add_portfolio_item(item: PortfolioItemCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    
    if item.asset_type in MARKET_LINKED_TYPES:
        history = yf.Ticker(item.ticker).history(period="1d")
        if history.empty:
            raise HTTPException(status_code=400, detail=f"Asset '{item.ticker}' has no active price data.")

    new_item = PortfolioItem(
        owner_id=current_user.id,
        ticker=item.ticker,
        quantity=item.quantity,
        average_buy_price=item.average_buy_price,
        asset_type=item.asset_type,
        maturity_date=item.maturity_date,
    )
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return {"message": "Trade added successfully"}

@app.get("/api/portfolio")
def get_portfolio(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = current_user.id 
    items = db.query(PortfolioItem).filter(PortfolioItem.owner_id == user_id).all()
    
    portfolio_summary = []
    total_portfolio_value = 0.0
    total_portfolio_cost = 0.0

    fixed_income_types = {"FD", "RD", "GOV_BOND", "PPF", "SCSS", "CORP_BOND", "NPS", "REAL_ESTATE", "GOLD", "PE", "ULIP"}

    for item in items:
        if item.asset_type in fixed_income_types:
            current_price = item.average_buy_price
        else:
            cached_metric = db.query(AssetMetric).filter(AssetMetric.ticker == item.ticker).first()
            if cached_metric and cached_metric.current_price:
                current_price = cached_metric.current_price
            else:
                try:
                    hist = yf.Ticker(item.ticker).history(period="1d")
                    current_price = float(hist["Close"].iloc[-1]) if not hist.empty else item.average_buy_price
                except (IndexError, KeyError, ValueError):
                    current_price = item.average_buy_price

        total_cost = item.quantity * item.average_buy_price
        current_value = item.quantity * current_price
        profit_loss = current_value - total_cost
        profit_loss_percent = (profit_loss / total_cost) * 100 if total_cost > 0 else 0.0

        total_portfolio_value += current_value
        total_portfolio_cost += total_cost

        portfolio_summary.append({
            "id": item.id,
            "ticker": item.ticker,
            "quantity": item.quantity,
            "average_buy_price": item.average_buy_price,
            "asset_type": item.asset_type,
            "maturity_date": item.maturity_date.isoformat() if item.maturity_date else None,
            "current_price": current_price,
            "current_value": current_value,
            "pnl": profit_loss,
            "pnl_percent": profit_loss_percent,
        })
        
    total_pnl = total_portfolio_value - total_portfolio_cost
    
    total_pnl_percent = (total_pnl / total_portfolio_cost) * 100 if total_portfolio_cost > 0 else 0.0
    
    return {
        "user_id": user_id,
        "total_value": total_portfolio_value,
        "total_cost": total_portfolio_cost,
        "total_pnl": total_pnl,
        "total_pnl_percent": total_pnl_percent,
        "holdings": portfolio_summary,
        "message": "Portfolio is empty." if not portfolio_summary else None,
    }

@app.post("/api/advisor")
def get_investment_advice(request: AdvisorRequest):
    try:
        # Pass the new field into the engine
        scoreboard = generate_scoreboard(request.amount, request.time_period, request.is_monthly)
        return scoreboard
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/register")
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # 1. Check if the email already exists in our database
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    # 2. Hash the password! Never save 'user.password' directly.
    hashed_pwd = get_password_hash(user.password)
    
    # 3. Create the user object and save to DB
    new_user = User(email=user.email, hashed_password=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "User created successfully", "user_id": new_user.id}

@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # 1. Find the user by their email (OAuth2 uses the word 'username' by default, 
    # so the user will type their email into the 'username' field)
    user = db.query(User).filter(User.email == form_data.username).first()
    
    # 2. If the user doesn't exist, or the password doesn't match the hash in the DB:
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401, 
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 3. Create the VIP Stamp (JWT Token)
    access_token = create_access_token(data={"sub": user.email})
    
    # 4. Return it to the frontend!
    return {"access_token": access_token, "token_type": "bearer"}

def _symbol_hint(symbol: str, name: str, quote_type: str, exchange: str) -> str:
    if symbol in SYMBOL_HINTS:
        return SYMBOL_HINTS[symbol]
    type_label = quote_type.replace("_", " ").title() if quote_type else "Security"
    return f"{type_label} · {exchange} — {name}"


@app.get("/api/investment-catalog")
def get_investment_catalog():
    return {"groups": INVESTMENT_GROUPS, "fields": TYPE_FIELD_SCHEMA}


@app.get("/api/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "occupation": current_user.occupation,
        "risk_appetite": current_user.risk_appetite or "Moderate",
        "avatar_color": current_user.avatar_color or "#c9a227",
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }


@app.put("/api/profile")
def update_profile(
    data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return {
        "email": current_user.email,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
        "occupation": current_user.occupation,
        "risk_appetite": current_user.risk_appetite or "Moderate",
        "avatar_color": current_user.avatar_color or "#c9a227",
        "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
    }


@app.post("/api/portfolio/sync/pan")
def sync_portfolio_pan(
    body: PanSyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Demo PAN sync — imports sample holdings. Wire to NSDL/CDSL APIs in production."""
    pan = body.pan.strip().upper()
    if len(pan) != 10:
        raise HTTPException(status_code=400, detail="PAN must be 10 characters (e.g. ABCDE1234F)")

    demo = [
        ("HDFCBANK.NS", 10, 1650.0, "STOCK"),
        ("INFY.NS", 15, 1450.0, "STOCK"),
        ("PPF-Account", 50000, 50000.0, "PPF"),
    ]
    added = 0
    for ticker, qty, price, atype in demo:
        exists = db.query(PortfolioItem).filter(
            PortfolioItem.owner_id == current_user.id,
            PortfolioItem.ticker == ticker,
        ).first()
        if exists:
            continue
        db.add(PortfolioItem(
            owner_id=current_user.id,
            ticker=ticker,
            quantity=qty,
            average_buy_price=price,
            asset_type=atype,
        ))
        added += 1
    db.commit()
    return {"message": f"PAN sync complete for {pan[:4]}****. Imported {added} new holding(s).", "imported": added}


@app.post("/api/portfolio/sync/mfcentral")
def sync_portfolio_mfcentral(
    body: MfCentralSyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Demo MF Central sync — OTP flow stub. Integrate MF Central API for production."""
    mobile = "".join(c for c in body.mobile if c.isdigit())
    if len(mobile) < 10:
        raise HTTPException(status_code=400, detail="Enter a valid 10-digit mobile number")
    if not body.otp:
        return {"status": "otp_required", "message": "OTP sent to registered mobile (demo). Submit again with otp."}

    demo = [
        ("122019", 250.5, 45.2, "MF"),
        ("120503", 120.0, 88.5, "MF"),
    ]
    added = 0
    for ticker, qty, price, atype in demo:
        exists = db.query(PortfolioItem).filter(
            PortfolioItem.owner_id == current_user.id,
            PortfolioItem.ticker == ticker,
        ).first()
        if exists:
            continue
        db.add(PortfolioItem(
            owner_id=current_user.id,
            ticker=f"MF-{ticker}",
            quantity=qty,
            average_buy_price=price,
            asset_type=atype,
        ))
        added += 1
    db.commit()
    return {"message": f"MF Central sync complete. Imported {added} mutual fund holding(s).", "imported": added}


@app.get("/api/search")
def search_assets(q: str):
    """Search Yahoo Finance with layman-friendly disambiguation hints."""
    if not q or len(q) < 2:
        return []

    url = f"https://query2.finance.yahoo.com/v1/finance/search?q={q}"
    headers = {"User-Agent": "Mozilla/5.0"}

    response = requests.get(url, headers=headers, timeout=8)
    if response.status_code != 200:
        return []

    data = response.json()
    results = []
    for item in data.get("quotes", []):
        if "symbol" not in item:
            continue
        name = item.get("shortname") or item.get("longname") or item["symbol"]
        exchange = item.get("exchDisp", "Unknown")
        quote_type = item.get("quoteType", "")
        symbol = item["symbol"]
        results.append({
            "symbol": symbol,
            "name": name,
            "exchange": exchange,
            "quote_type": quote_type,
            "hint": _symbol_hint(symbol, name, quote_type, exchange),
        })
    return results[:8]

@app.post("/api/analyze")
def analyze_stocks(request: AnalysisRequest):
    try:
        # A safety check so users don't request 50 stocks at once and crash the server
        if len(request.tickers) > 5:
            raise HTTPException(status_code=400, detail="You can only compare up to 5 stocks at a time.")
            
        data = generate_stock_comparison(request.tickers, request.period)
        return data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))