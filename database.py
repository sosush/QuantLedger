import os

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Date, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime
from quant_engine import calculate_asset_metrics

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
    full_name = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    occupation = Column(String, nullable=True)
    risk_appetite = Column(String, default="Moderate")
    avatar_color = Column(String, default="#c9a227")
    created_at = Column(DateTime, default=datetime.utcnow)

    portfolio = relationship("PortfolioItem", back_populates="owner")

class PortfolioItem(Base):
    __tablename__ = "portfolio_items"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, index=True)
    quantity = Column(Float)
    average_buy_price = Column(Float)
    asset_type = Column(String, default="STOCK")
    maturity_date = Column(Date, nullable=True)

    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="portfolio")

Base.metadata.create_all(bind=engine)


def _ensure_user_profile_columns():
    """Add profile columns to existing SQLite DBs without a full migration tool."""
    if not DATABASE_URL.startswith("sqlite"):
        return
    import sqlite3

    path = DATABASE_URL.replace("sqlite:///", "")
    if path == DATABASE_URL:
        return
    conn = sqlite3.connect(path)
    cur = conn.cursor()
    cur.execute("PRAGMA table_info(users)")
    existing = {row[1] for row in cur.fetchall()}
    alters = [
        ("full_name", "TEXT"),
        ("phone", "TEXT"),
        ("occupation", "TEXT"),
        ("risk_appetite", "TEXT DEFAULT 'Moderate'"),
        ("avatar_color", "TEXT DEFAULT '#c9a227'"),
        ("created_at", "DATETIME"),
    ]
    for col, col_type in alters:
        if col not in existing:
            cur.execute(f"ALTER TABLE users ADD COLUMN {col} {col_type}")
    conn.commit()
    conn.close()


_ensure_user_profile_columns()


if __name__ == "__main__":
    ticker_symbol = "AAPL"
    metrics_data = calculate_asset_metrics(ticker_symbol)
    db = SessionLocal()
