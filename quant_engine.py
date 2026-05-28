import yfinance as yf
import pandas as pd
import numpy as np

def calculate_asset_metrics(ticker:str)->dict:
    aapl=yf.Ticker(ticker)
    df=aapl.history(period="1y")

    daily_returns=df['Close'].pct_change(periods=1, fill_method=None, freq=None)
    daily_returns.dropna(inplace=True)

    volatility=daily_returns.std()
    annualized_volatility=volatility*np.sqrt(252)

    annualized_return=daily_returns.mean()*252
    sharp_ratio=(annualized_return-0.04)/annualized_volatility

    momentum_12m = df['Close'].iloc[-1]/df['Close'].iloc[0] - 1
    momentum_3m = df['Close'].iloc[-1]/df['Close'].iloc[-63] - 1
    return{
        'volatility': annualized_volatility,
        'sharp_ratio': sharp_ratio,
        'momentum_12m': momentum_12m,
        'momentum_3m': momentum_3m
    }


print(calculate_asset_metrics("AAPL"))