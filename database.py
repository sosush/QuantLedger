import os

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime
from quant_engine import calculate_asset_metrics
from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship

from env_loader import load_env

load_env()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./finance.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class AssetMetric(Base):
    __tablename__ = "asset_metrics"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, unique=True, index=True)
    current_price = Column(Float, nullable=True)
    volatility = Column(Float)
    sharpe_ratio = Column(Float)
    momentum_12m = Column(Float)
    momentum_3m = Column(Float)
    
    last_updated = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    portfolio = relationship("PortfolioItem", back_populates="owner")

class PortfolioItem(Base):
    __tablename__ = "portfolio_items"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, index=True)
    quantity = Column(Float) 
    average_buy_price = Column(Float)
    
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    owner = relationship("User", back_populates="portfolio")

Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    ticker_symbol = "AAPL"
    metrics_data = calculate_asset_metrics(ticker_symbol)
    db = SessionLocal()