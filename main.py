from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal, AssetMetric
from quant_engine import calculate_asset_metrics
from pydantic import BaseModel
from database import PortfolioItem
from recommender import generate_wealth_plan
from auth import get_password_hash, verify_password, create_access_token
from database import User
from fastapi.security import OAuth2PasswordRequestForm


class PortfolioItemCreate(BaseModel):
    user_id: int
    ticker: str
    quantity: float
    average_buy_price: float

class WealthPlanRequest(BaseModel):
    amount: float
    is_monthly: bool
    time_period_years: int
    risk_profile: str  # "Conservative" or "Aggressive"

class UserCreate(BaseModel):
    email: str
    password: str

app = FastAPI(title="QuantLedger API")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
def add_portfolio_item(item: PortfolioItemCreate, db: Session = Depends(get_db)):
    new_item = PortfolioItem(
        owner_id=item.user_id,
        ticker=item.ticker.upper(),
        quantity=item.quantity,
        average_buy_price=item.average_buy_price
    )
    
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return {"message": f"Successfully added {item.quantity} shares of {item.ticker}", "item_id": new_item.id}

import yfinance as yf

@app.get("/api/portfolio/{user_id}")
def get_portfolio(user_id: int, db: Session = Depends(get_db)):
    items = db.query(PortfolioItem).filter(PortfolioItem.owner_id == user_id).all()
    
    if not items:
        return {"message": "Portfolio is empty."}
    
    portfolio_summary = []
    total_portfolio_value = 0.0
    total_portfolio_cost = 0.0
    
    # Loop through each item the user owns
    for item in items:
        current_price = yf.Ticker(item.ticker).history(period="1d")['Close'].iloc[-1]
        
        total_cost = item.quantity * item.average_buy_price
        current_value = item.quantity * current_price
        
        # Defensive programming: avoid dividing by zero if average_buy_price is 0
        profit_loss = current_value - total_cost
        profit_loss_percent = (profit_loss / total_cost) * 100 if total_cost > 0 else 0.0
        
        # FIX: Actually update the running totals!
        total_portfolio_value += current_value
        total_portfolio_cost += total_cost
        
        portfolio_summary.append({ 
            "ticker": item.ticker, 
            "quantity": item.quantity,
            "current_price": current_price,
            "pnl": profit_loss, 
            "pnl_percent": profit_loss_percent 
        })
        
    total_pnl = total_portfolio_value - total_portfolio_cost
    
    # FIX: Defensive programming to prevent ZeroDivisionError
    total_pnl_percent = (total_pnl / total_portfolio_cost) * 100 if total_portfolio_cost > 0 else 0.0
    
    return {
        "user_id": user_id,
        "total_value": total_portfolio_value,
        "total_cost": total_portfolio_cost,
        "total_pnl": total_pnl,
        "total_pnl_percent": total_pnl_percent,
        "holdings": portfolio_summary
    }

@app.post("/api/plan")
def get_wealth_plan(request: WealthPlanRequest):
    try:
        # Pass the data from the API request directly into your engine
        plan = generate_wealth_plan(
            amount=request.amount,
            is_monthly=request.is_monthly,
            time_period_years=request.time_period_years,
            risk_profile=request.risk_profile
        )
        return plan
    except Exception as e:
        # If they pass a bad risk profile or something breaks, return a 400 error
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