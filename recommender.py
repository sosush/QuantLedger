from quant_engine import calculate_asset_metrics

# 1. Database of Fixed Income Assets (Since these don't have tickers, we define them here)
FIXED_ASSETS = [
    {"name": "Standard Fixed Deposit (FD)", "type": "FD", "annual_return": 0.07, "risk": "Low", "min_time_years": 1},
    {"name": "Tax-Saver FD", "type": "FD", "annual_return": 0.075, "risk": "Low", "min_time_years": 5},
    {"name": "Recurring Deposit (RD)", "type": "RD", "annual_return": 0.065, "risk": "Low", "min_time_years": 1},
    {"name": "Government Bond (G-Sec)", "type": "Bond", "annual_return": 0.073, "risk": "Low", "min_time_years": 10}
]

MARKET_ASSETS = [
    "AAPL", "TSLA",       
    "VOO", "QQQ",         
]

def generate_wealth_plan(amount: float, is_monthly: bool, time_period_years: int, risk_profile: str) -> dict:
    recommendations = {
        "strategy": "",
        "suggested_fixed_assets": [],
        "suggested_market_assets": []
    }

    # --- BLOCK 1: Short Term (< 3 years) ---
    if time_period_years < 3:
        recommendations["strategy"] = "Capital Preservation"
        
        for asset in FIXED_ASSETS:
            # Only look at assets where the lock-in period is less than our time frame
            if asset["min_time_years"] <= time_period_years:
                
                # If they are investing monthly, recommend the Recurring Deposit (RD)
                if is_monthly and asset["type"] == "RD":
                    recommendations["suggested_fixed_assets"].append(asset)
                    
                # If it's a lump sum, recommend the Fixed Deposit (FD)
                elif not is_monthly and asset["type"] == "FD":
                    recommendations["suggested_fixed_assets"].append(asset)

    # --- BLOCK 2: Medium Term (3 to 7 years) ---
    elif 3 <= time_period_years <= 7:
        recommendations["strategy"] = "Balanced Growth"
        
        # 1. Give them a Standard FD for safety
        recommendations["suggested_fixed_assets"].append(FIXED_ASSETS[0]) 
        
        # 2. Give them the S&P 500 Index Fund (VOO) for growth
        voo_metrics = calculate_asset_metrics("VOO")
        voo_metrics["ticker"] = "VOO" # Add the name so we know what this data belongs to
        recommendations["suggested_market_assets"].append(voo_metrics)
        
    # --- BLOCK 3: Long Term (> 7 years) ---
    else:
        recommendations["strategy"] = "Aggressive Wealth Accumulation"
        
        # First, we calculate the metrics for ALL market assets and store them in a temporary list
        market_data = []
        for ticker in MARKET_ASSETS:
            metrics = calculate_asset_metrics(ticker)
            metrics["ticker"] = ticker 
            market_data.append(metrics)

        # Now, we SORT the list based on the user's risk profile!
        # (This is the Python magic for ranking things)
        if risk_profile == "Conservative":
            # Sort by Sharpe Ratio (Highest to lowest). lambda x: x["sharp_ratio"] tells Python to look at that specific number.
            market_data.sort(key=lambda x: x["sharp_ratio"], reverse=True)
            
        elif risk_profile == "Aggressive":
            # Sort by 12-Month Momentum (Highest to lowest)
            market_data.sort(key=lambda x: x["momentum_12m"], reverse=True)

        # Finally, put the sorted list into our recommendations
        recommendations["suggested_market_assets"] = market_data

    return recommendations

if __name__ == "__main__":
    print("--- SCENARIO 1: Saving for a car in 2 years, Lump Sum ---")
    plan1 = generate_wealth_plan(amount=50000, is_monthly=False, time_period_years=2, risk_profile="Conservative")
    print(plan1)

    print("\n--- SCENARIO 2: Retirement planning, 15 years, Aggressive ---")
    plan2 = generate_wealth_plan(amount=100000, is_monthly=False, time_period_years=15, risk_profile="Aggressive")
    print(plan2)