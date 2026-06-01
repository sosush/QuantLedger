def fetch_non_market_rates():
    """
    Top fixed-income rates (fallback when live bank scraping is unavailable).
    Updated quarterly-style benchmarks; replace with live scrape when available.
    """
    try:
        raise Exception("Scraping simulated/failed, using fallback")
    except Exception:
        return [
            {"name": "Post Office SCSS (Senior)", "rate": 8.20},
            {"name": "HDFC Bank FD (5 Yr)", "rate": 7.20},
            {"name": "SBI Bank FD (5 Yr)", "rate": 7.10},
            {"name": "PPF (Govt)", "rate": 7.10},
            {"name": "Kisan Vikas Patra", "rate": 7.50},
        ]


def fetch_market_linked_top5():
    """Representative trailing CAGR / yield proxies for display (not live NAV)."""
    return [
        {"name": "UTI Nifty 50 Index Fund", "rate": 12.4},
        {"name": "HDFC Sensex Index Fund", "rate": 11.9},
        {"name": "Mirae Asset Nifty 50 ETF", "rate": 12.1},
        {"name": "Parag Parikh Flexi Cap", "rate": 13.2},
        {"name": "SBI Nifty Index Fund", "rate": 11.8},
    ]


def fetch_physical_top5():
    return [
        {"name": "Sovereign Gold Bonds (RBI)", "rate": 9.0},
        {"name": "Nippon India Gold ETF (GOLDBEES)", "rate": 8.2},
        {"name": "Embassy REIT", "rate": 7.5},
        {"name": "Bitcoin (BTC-USD) — 5Y CAGR proxy", "rate": 22.0},
        {"name": "Direct Real Estate (Tier-1 rental yield)", "rate": 3.5},
    ]


def _sip_future_value(amount: float, annual_rate: float, months: int) -> float:
    monthly_rate = annual_rate / 12
    if monthly_rate == 0:
        return amount * months
    return (
        amount
        * (((1 + monthly_rate) ** months - 1) / monthly_rate)
        * (1 + monthly_rate)
    )


def _project_range(
    amount: float, rate_min: float, rate_max: float, years: int, is_monthly: bool
) -> tuple[float, float, float]:
    if is_monthly:
        months = years * 12
        total_invested = amount * months
        projected_min = _sip_future_value(amount, rate_min, months)
        projected_max = _sip_future_value(amount, rate_max, months)
    else:
        total_invested = amount
        projected_min = amount * ((1 + rate_min) ** years)
        projected_max = amount * ((1 + rate_max) ** years)
    return total_invested, projected_min, projected_max


def generate_scoreboard(amount: float, time_years: str, is_monthly: bool) -> dict:
    years = 10 if time_years == "none" else int(time_years)

    categories = [
        {
            "id": "fixed_income",
            "name": "Fixed Income / Low Risk",
            "description": "FDs, RDs, government bonds, PPF, SCSS, corporate bonds — capital preservation focus.",
            "return_min": 6.5,
            "return_max": 8.2,
            "risk_level": "Low",
            "minimum_years_recommended": 1,
            "specific_options": fetch_non_market_rates(),
        },
        {
            "id": "market_linked",
            "name": "Market Linked / Medium–High Risk",
            "description": "Stocks, mutual funds, ETFs, ULIPs, NPS — growth with market volatility.",
            "return_min": 10.0,
            "return_max": 15.0,
            "risk_level": "Medium-High",
            "minimum_years_recommended": 3,
            "specific_options": fetch_market_linked_top5(),
        },
        {
            "id": "physical",
            "name": "Physical & Alternative Assets",
            "description": "Real estate, REITs, gold, crypto, private equity — diversification & inflation hedge.",
            "return_min": 5.0,
            "return_max": 18.0,
            "risk_level": "Varies",
            "minimum_years_recommended": 5,
            "specific_options": fetch_physical_top5(),
        },
    ]

    scoreboard = []

    for cat in categories:
        rate_min = cat["return_min"] / 100
        rate_max = cat["return_max"] / 100
        total_invested, projected_min, projected_max = _project_range(
            amount, rate_min, rate_max, years, is_monthly
        )
        profit_min = projected_min - total_invested
        profit_max = projected_max - total_invested

        score = 100
        if years < cat["minimum_years_recommended"]:
            score -= (cat["minimum_years_recommended"] - years) * 25

        if time_years == "none" and cat["risk_level"] in ("Medium-High", "Varies"):
            score += 15

        score = max(0, min(100, score))

        scoreboard.append({
            "id": cat["id"],
            "name": cat["name"],
            "description": cat["description"],
            "risk": cat["risk_level"],
            "return_min": cat["return_min"],
            "return_max": cat["return_max"],
            "total_invested": round(total_invested, 2),
            "projected_total_min": round(projected_min, 2),
            "projected_total_max": round(projected_max, 2),
            "projected_profit_min": round(profit_min, 2),
            "projected_profit_max": round(profit_max, 2),
            "projected_total": round((projected_min + projected_max) / 2, 2),
            "projected_profit": round((profit_min + profit_max) / 2, 2),
            "suitability_score": score,
            "specific_options": cat["specific_options"][:5],
        })

    scoreboard.sort(key=lambda x: x["suitability_score"], reverse=True)

    return {
        "user_input": {"amount": amount, "is_monthly": is_monthly, "years": years},
        "scoreboard": scoreboard,
    }
