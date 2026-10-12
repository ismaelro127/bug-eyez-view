import os
import requests
from flask import Blueprint, jsonify
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

finance_bp = Blueprint("finance", __name__)

# 🔹 GNews fallback setup
GNEWS_KEY = os.getenv("GNEWS_API_KEY")

def get_stock_data(symbol: str):
    """Fetch basic quote data using Yahoo Finance public API."""
    try:
        url = f"https://query1.finance.yahoo.com/v7/finance/quote?symbols={symbol}"
        res = requests.get(url, timeout=10)
        data = res.json()["quoteResponse"]["result"]
        if not data:
            return {"error": "No data found for symbol"}
        d = data[0]
        return {
            "symbol": d.get("symbol"),
            "name": d.get("shortName"),
            "price": d.get("regularMarketPrice"),
            "change": d.get("regularMarketChange"),
            "percent_change": d.get("regularMarketChangePercent"),
            "market_time": d.get("regularMarketTime"),
            "currency": d.get("currency", "USD"),
            "exchange": d.get("fullExchangeName", "Unknown"),
        }
    except Exception as e:
        print(f"⚠️ Yahoo Finance error for {symbol}: {e}")
        return {"error": str(e)}

def get_finance_headlines(symbol: str):
    """Fetch financial headlines using GNews."""
    if not GNEWS_KEY:
        return None
    try:
        url = f"https://gnews.io/api/v4/search?q={symbol}&token={GNEWS_KEY}&lang=en"
        r = requests.get(url, timeout=10)
        data = r.json().get("articles", [])
        if not data:
            return None
        top = data[0]
        return {
            "headline": top.get("title"),
            "url": top.get("url"),
            "source": top.get("source", {}).get("name", "GNews"),
            "description": top.get("description", ""),
        }
    except Exception as e:
        print(f"⚠️ GNews finance lookup failed for {symbol}: {e}")
    return None

@finance_bp.route("/ai/finance/<symbol>")
def finance_lookup(symbol):
    """Return financial info + recent news."""
    stock_info = get_stock_data(symbol)
    news_info = get_finance_headlines(symbol)
    return jsonify({
        "symbol": symbol.upper(),
        "stock_info": stock_info,
        "news": news_info or {"description": "No recent headlines"}
    })
