def generate_scoreboard(amount: float, time_years: str, is_monthly: bool) -> dict:
    years = 10 if time_years == "none" else int(time_years)
    
    # We build the dictionary with specific drill-down options!
    categories = [
        {
            "id": "rd" if is_monthly else "fd",
            "name": "Recurring Deposit (RD)" if is_monthly else "Fixed Deposit (FD)",
            "description": "Safe, guaranteed returns by the bank. No market risk.",
            "historical_return_percent": 7.0,
            "risk_level": "Zero",
            "minimum_years_recommended": 1,
            # THE DRILL DOWN DATA:
            "specific_options": [
                {"name": "HDFC Bank", "rate": 7.10},
                {"name": "Axis Bank", "rate": 7.20},
                {"name": "SBI", "rate": 6.80}
            ]
        },
        {
            "id": "gold",
            "name": "Digital Gold / SGBs",
            "description": "A hedge against inflation. Very safe long-term store of value.",
            "historical_return_percent": 8.5,
            "risk_level": "Low",
            "minimum_years_recommended": 3,
            "specific_options": [
                {"name": "Sovereign Gold Bonds (RBI)", "rate": 9.0}, # Includes 2.5% fixed interest
                {"name": "Nippon India Gold ETF (GOLDBEES)", "rate": 8.2}
            ]
        },
        {
            "id": "mf_index",
            "name": "Index Mutual Funds",
            "description": "Invests in the top 50 companies. The best balance of safety and growth.",
            "historical_return_percent": 12.0,
            "risk_level": "Medium",
            "minimum_years_recommended": 3,
            "specific_options": [
                {"name": "UTI Nifty 50 Index Fund", "rate": 12.4},
                {"name": "HDFC Sensex Fund", "rate": 11.9}
            ]
        },
        {
            "id": "stocks_bluechip",
            "name": "Bluechip Stocks",
            "description": "Shares in massive, stable companies.",
            "historical_return_percent": 15.0,
            "risk_level": "Medium-High",
            "minimum_years_recommended": 5,
            "specific_options": [
                {"name": "Reliance Industries (RELIANCE.NS)", "rate": 14.5},
                {"name": "Tata Consultancy Services (TCS.NS)", "rate": 15.2},
                {"name": "Apple (AAPL)", "rate": 18.0}
            ]
        }
    ]

    scoreboard = []

    for cat in categories:
        rate = cat["historical_return_percent"] / 100
        
        # MATH FIX: Compound interest for Lump Sum vs. SIP (Monthly)
        if is_monthly:
            # SIP Future Value Formula: P * [((1 + r/n)^(nt) - 1) / (r/n)] * (1 + r/n)
            # Simplified monthly approximation:
            monthly_rate = rate / 12
            months = years * 12
            projected_total = amount * (((1 + monthly_rate)**months - 1) / monthly_rate) * (1 + monthly_rate)
            total_invested = amount * months
        else:
            projected_total = amount * ((1 + rate) ** years)
            total_invested = amount
            
        projected_profit = projected_total - total_invested
        
        # Suitability Score Logic
        score = 100
        if years < cat["minimum_years_recommended"]:
            score -= (cat["minimum_years_recommended"] - years) * 25
            
        if time_years == "none" and cat["risk_level"] in ["Medium", "Medium-High"]:
            score += 15 # Favor equity for long term
            
        score = max(0, min(100, score))

        scoreboard.append({
            "id": cat["id"],
            "name": cat["name"],
            "description": cat["description"],
            "risk": cat["risk_level"],
            "total_invested": round(total_invested, 2),
            "projected_total": round(projected_total, 2),
            "projected_profit": round(projected_profit, 2),
            "suitability_score": score,
            "specific_options": cat["specific_options"] # Pass the drill-down data to the frontend!
        })

    scoreboard.sort(key=lambda x: x["suitability_score"], reverse=True)

    return {
        "user_input": {"amount": amount, "is_monthly": is_monthly, "years": years},
        "scoreboard": scoreboard
    }