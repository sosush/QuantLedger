from apscheduler.schedulers.background import BackgroundScheduler
import yfinance as yf
from database import SessionLocal, AssetMetric
from datetime import datetime

def update_market_data():
    print(f"[{datetime.now()}] BACKGROUND JOB: Updating market data...")
    db = SessionLocal()
    try:
        metrics = db.query(AssetMetric).all()
        
        for metric in metrics:
            try:
                ticker = yf.Ticker(metric.ticker)
                current_price = ticker.history(period="1d")['Close'].iloc[-1]
                metric.current_price = current_price
                metric.last_updated = datetime.utcnow()
                print(f"Updated {metric.ticker} to ${current_price:.2f}")
                
            except Exception as e:
                print(f"Failed to update {metric.ticker}: {e}")
                
        db.commit()
        print("BACKGROUND JOB: Complete!")
    finally:
        db.close()

job_scheduler = BackgroundScheduler()
job_scheduler.add_job(update_market_data, 'interval', minutes=1)