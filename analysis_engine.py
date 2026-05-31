import yfinance as yf
import pandas as pd
import numpy as np

def generate_stock_comparison(tickers: list[str], period: str = "1y") -> dict:
    """
    Fetches historical data for multiple tickers, aligns the dates, 
    and calculates comparison metrics (Total Return, Volatility).
    Valid periods: '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max'
    """
    chart_data_df = pd.DataFrame()
    metrics = {}

    for ticker in tickers:
        try:
            # 1. Fetch historical data
            df = yf.Ticker(ticker).history(period=period)
            
            if df.empty:
                continue
                
            df.index = df.index.tz_localize(None).normalize()
            # 2. Extract just the Closing prices and add to our combined DataFrame
            close_prices = df['Close']
            chart_data_df[ticker] = close_prices

            # 3. Calculate Performance Metrics
            daily_returns = close_prices.pct_change().dropna()
            total_return = (close_prices.iloc[-1] / close_prices.iloc[0] - 1) * 100
            volatility = daily_returns.std() * np.sqrt(252) * 100

            metrics[ticker] = {
                "current_price": round(close_prices.iloc[-1], 2),
                "total_return_percent": round(total_return, 2),
                "volatility_percent": round(volatility, 2)
            }
        except Exception as e:
            print(f"Error fetching {ticker}: {e}")
            continue

    if chart_data_df.empty:
        raise ValueError("No valid data found for the provided tickers.")

    # 4. Data Cleaning: Forward-fill missing prices (e.g., if one stock was halted for a day)
    chart_data_df.ffill(inplace=True)
    chart_data_df.dropna(inplace=True)

    # 5. Format for React (Recharts requires an array of dictionaries)
    # Convert index (Dates) to a column and format as string "YYYY-MM-DD"
    chart_data_df.reset_index(inplace=True)
    
    # Handle timezone-aware dates (Yahoo finance sometimes returns timezone data)
    if pd.api.types.is_datetime64tz_dtype(chart_data_df['Date']):
        chart_data_df['Date'] = chart_data_df['Date'].dt.tz_localize(None)
        
    chart_data_df['Date'] = chart_data_df['Date'].dt.strftime('%Y-%m-%d')
    
    # Convert DataFrame to a list of dictionaries: [{"Date": "2023-01-01", "AAPL": 150, "TSLA": 200}, ...]
    chart_records = chart_data_df.to_dict(orient='records')

    return {
        "period": period,
        "metrics": metrics,
        "chart_data": chart_records
    }