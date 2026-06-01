"""Investment types and per-type field definitions for portfolio & advisor."""

INVESTMENT_GROUPS = [
    {
        "id": "fixed_income",
        "label": "Fixed Income / Low Risk",
        "types": [
            {"value": "FD", "label": "Fixed Deposit (FD)", "market_linked": False},
            {"value": "RD", "label": "Recurring Deposit (RD)", "market_linked": False},
            {"value": "GOV_BOND", "label": "Government Bonds & Securities", "market_linked": False},
            {"value": "PPF", "label": "Public Provident Fund (PPF)", "market_linked": False},
            {"value": "SCSS", "label": "Senior Citizens Savings Scheme (SCSS)", "market_linked": False},
            {"value": "CORP_BOND", "label": "Corporate Bonds", "market_linked": False},
        ],
    },
    {
        "id": "market_linked",
        "label": "Market Linked / Medium–High Risk",
        "types": [
            {"value": "STOCK", "label": "Stocks / Equities", "market_linked": True},
            {"value": "MF", "label": "Mutual Funds", "market_linked": True},
            {"value": "ETF", "label": "ETFs", "market_linked": True},
            {"value": "ULIP", "label": "ULIPs", "market_linked": True},
            {"value": "NPS", "label": "National Pension System (NPS)", "market_linked": False},
        ],
    },
    {
        "id": "physical",
        "label": "Physical & Alternative Assets",
        "types": [
            {"value": "REAL_ESTATE", "label": "Real Estate", "market_linked": False},
            {"value": "REIT", "label": "REITs", "market_linked": True},
            {"value": "GOLD", "label": "Gold & Precious Metals", "market_linked": False},
            {"value": "CRYPTO", "label": "Cryptocurrencies", "market_linked": True},
            {"value": "PE", "label": "Private Equity / Hedge Funds", "market_linked": False},
        ],
    },
]

# Fields shown in portfolio form: key -> label, input type
TYPE_FIELD_SCHEMA = {
    "STOCK": [
        {"key": "ticker", "label": "Stock symbol", "type": "search", "required": True},
        {"key": "quantity", "label": "Shares", "type": "number", "required": True},
        {"key": "average_buy_price", "label": "Avg. buy price", "type": "number", "required": True},
    ],
    "MF": [
        {"key": "ticker", "label": "Fund", "type": "search", "required": True},
        {"key": "quantity", "label": "Units", "type": "number", "required": True},
        {"key": "average_buy_price", "label": "NAV at purchase", "type": "number", "required": True},
    ],
    "ETF": [
        {"key": "ticker", "label": "ETF", "type": "search", "required": True},
        {"key": "quantity", "label": "Units", "type": "number", "required": True},
        {"key": "average_buy_price", "label": "Avg. buy price", "type": "number", "required": True},
    ],
    "REIT": [
        {"key": "ticker", "label": "REIT symbol", "type": "search", "required": True},
        {"key": "quantity", "label": "Units", "type": "number", "required": True},
        {"key": "average_buy_price", "label": "Avg. buy price", "type": "number", "required": True},
    ],
    "CRYPTO": [
        {"key": "ticker", "label": "Symbol (e.g. BTC-USD)", "type": "text", "required": True},
        {"key": "quantity", "label": "Amount", "type": "number", "required": True},
        {"key": "average_buy_price", "label": "Avg. cost", "type": "number", "required": True},
    ],
    "FD": [
        {"key": "ticker", "label": "Bank / issuer name", "type": "text", "required": True},
        {"key": "quantity", "label": "Principal (₹)", "type": "number", "required": True},
        {"key": "average_buy_price", "label": "Interest rate (%)", "type": "number", "required": True},
        {"key": "maturity_date", "label": "Maturity date", "type": "date", "required": False},
    ],
    "RD": [
        {"key": "ticker", "label": "Bank / post office", "type": "text", "required": True},
        {"key": "quantity", "label": "Monthly installment (₹)", "type": "number", "required": True},
        {"key": "average_buy_price", "label": "Interest rate (%)", "type": "number", "required": True},
        {"key": "maturity_date", "label": "Maturity date", "type": "date", "required": False},
    ],
    "GOV_BOND": [
        {"key": "ticker", "label": "Bond name / series", "type": "text", "required": True},
        {"key": "quantity", "label": "Face value (₹)", "type": "number", "required": True},
        {"key": "average_buy_price", "label": "Coupon yield (%)", "type": "number", "required": True},
    ],
    "PPF": [
        {"key": "ticker", "label": "Account / bank branch", "type": "text", "required": True},
        {"key": "quantity", "label": "Annual contribution (₹)", "type": "number", "required": True},
        {"key": "average_buy_price", "label": "Current balance (₹)", "type": "number", "required": True},
    ],
    "SCSS": [
        {"key": "ticker", "label": "Post office / bank", "type": "text", "required": True},
        {"key": "quantity", "label": "Deposit amount (₹)", "type": "number", "required": True},
        {"key": "average_buy_price", "label": "Interest rate (%)", "type": "number", "required": True},
    ],
    "CORP_BOND": [
        {"key": "ticker", "label": "Issuer / ISIN", "type": "text", "required": True},
        {"key": "quantity", "label": "Investment (₹)", "type": "number", "required": True},
        {"key": "average_buy_price", "label": "Coupon rate (%)", "type": "number", "required": True},
    ],
    "ULIP": [
        {"key": "ticker", "label": "Policy / insurer name", "type": "text", "required": True},
        {"key": "quantity", "label": "Annual premium (₹)", "type": "number", "required": True},
        {"key": "average_buy_price", "label": "Fund value (₹)", "type": "number", "required": True},
    ],
    "NPS": [
        {"key": "ticker", "label": "PRAN / fund manager", "type": "text", "required": True},
        {"key": "quantity", "label": "Units / allocation %", "type": "number", "required": True},
        {"key": "average_buy_price", "label": "Current value (₹)", "type": "number", "required": True},
    ],
    "REAL_ESTATE": [
        {"key": "ticker", "label": "Property label / location", "type": "text", "required": True},
        {"key": "quantity", "label": "Area (sq ft) or share %", "type": "number", "required": True},
        {"key": "average_buy_price", "label": "Purchase price (₹)", "type": "number", "required": True},
    ],
    "GOLD": [
        {"key": "ticker", "label": "Form (SGB / physical / ETF)", "type": "text", "required": True},
        {"key": "quantity", "label": "Grams or units", "type": "number", "required": True},
        {"key": "average_buy_price", "label": "Buy price per unit (₹)", "type": "number", "required": True},
    ],
    "PE": [
        {"key": "ticker", "label": "Fund name", "type": "text", "required": True},
        {"key": "quantity", "label": "Committed capital (₹)", "type": "number", "required": True},
        {"key": "average_buy_price", "label": "Current NAV estimate (₹)", "type": "number", "required": True},
    ],
}

MARKET_LINKED_TYPES = {
    t["value"]
    for g in INVESTMENT_GROUPS
    for t in g["types"]
    if t.get("market_linked")
}

# Layman hints for ambiguous Indian tickers (symbol -> hint)
SYMBOL_HINTS = {
    "HDFC.NS": "HDFC Ltd (holding company) — not HDFC Bank",
    "HDFCBANK.NS": "HDFC Bank — retail & corporate banking",
    "HDFC": "US listing — verify exchange before buying",
    "HDFCBANK": "HDFC Bank — banking stock",
    "ICICIBANK.NS": "ICICI Bank — full-service bank",
    "ICICI.NS": "ICICI Ltd — parent / financial services",
    "SBIN.NS": "State Bank of India",
    "SBI": "Often confused with SBIN — use SBIN.NS for NSE",
    "M&M.NS": "Mahindra & Mahindra — automaker",
    "MM": "Different US ticker — not Mahindra",
    "ITC.NS": "ITC Ltd — FMCG & cigarettes",
    "TCS.NS": "Tata Consultancy Services — IT services",
    "TATASTEEL.NS": "Tata Steel",
    "TATAMOTORS.NS": "Tata Motors",
}
