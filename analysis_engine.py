import yfinance as yf
import pandas as pd
import numpy as np


def generate_stock_comparison(tickers: list[str], period: str = "1y") -> dict:
    """
    Fetches historical data for multiple tickers, aligns the dates,
    and calculates comparison metrics (Total Return, Volatility, Beta matrix).
    Valid periods: '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max'
    """
    chart_data_df = pd.DataFrame()
    metrics = {}

    for ticker in tickers:
        try:
            df = yf.Ticker(ticker).history(period=period)

            if df.empty:
                continue

            df.index = df.index.tz_localize(None).normalize()
            close_prices = df["Close"]
            chart_data_df[ticker] = close_prices

            daily_returns = close_prices.pct_change().dropna()
            total_return = (close_prices.iloc[-1] / close_prices.iloc[0] - 1) * 100
            volatility = daily_returns.std() * np.sqrt(252) * 100

            metrics[ticker] = {
                "current_price": round(close_prices.iloc[-1], 2),
                "total_return_percent": round(total_return, 2),
                "volatility_percent": round(volatility, 2),
            }
        except Exception as e:
            print(f"Error fetching {ticker}: {e}")
            continue

    if chart_data_df.empty:
        raise ValueError("No valid data found for the provided tickers.")

    chart_data_df.ffill(inplace=True)
    chart_data_df.dropna(inplace=True)

    daily_returns_df = chart_data_df.pct_change().dropna()
    cov_matrix = daily_returns_df.cov()
    var_series = daily_returns_df.var()

    beta_matrix = {}
    for col_a in chart_data_df.columns:
        beta_matrix[col_a] = {}
        for col_b in chart_data_df.columns:
            if col_a == col_b:
                beta_matrix[col_a][col_b] = 1.0
            else:
                beta = cov_matrix.loc[col_a, col_b] / var_series[col_a]
                beta_matrix[col_a][col_b] = round(float(beta), 3)

    chart_data_df.reset_index(inplace=True)

    if pd.api.types.is_datetime64tz_dtype(chart_data_df["Date"]):
        chart_data_df["Date"] = chart_data_df["Date"].dt.tz_localize(None)

    chart_data_df["Date"] = chart_data_df["Date"].dt.strftime("%Y-%m-%d")
    chart_records = chart_data_df.to_dict(orient="records")

    return {
        "period": period,
        "metrics": metrics,
        "beta_matrix": beta_matrix,
        "chart_data": chart_records,
    }
