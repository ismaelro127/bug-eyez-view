# backend/news_engine/config.py

import os

# API KEYS (fill in later)
NEWS_API_KEY = os.getenv("NEWS_API_KEY", "your_newsapi_key_here")
POLYGON_KEY = os.getenv("POLYGON_KEY", "your_polygon_key_here")
FINNHUB_KEY = os.getenv("FINNHUB_KEY", "your_finnhub_key_here")

# Storage paths
CACHE_DIR = os.path.join("backend", "news_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# Default categories to collect
CATEGORIES = [
    "general", "business", "technology", "entertainment",
    "sports", "science", "health"
]
