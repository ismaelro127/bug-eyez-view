# backend/news_engine/storage.py

import os, json
from datetime import datetime
from .config import CACHE_DIR

def save_articles(articles, category):
    """Save AI-tagged news to JSON cache."""
    path = os.path.join(CACHE_DIR, f"{category}.json")
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            existing = json.load(f)
    else:
        existing = []

    existing = existing[:500]  # keep cache size manageable
    all_articles = articles + existing
    with open(path, "w", encoding="utf-8") as f:
        json.dump(all_articles, f, indent=2, ensure_ascii=False)

    print(f"💾 Saved {len(articles)} new → {path}")

def search_news(query, category=None):
    """Search cached news for relevant tags or keywords."""
    results = []
    for fname in os.listdir(CACHE_DIR):
        if not fname.endswith(".json"): continue
        path = os.path.join(CACHE_DIR, fname)
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        for item in data:
            text = f"{item.get('title','')} {item.get('description','')}"
            tags = " ".join(item.get("tags", []))
            if query.lower() in text.lower() or query.lower() in tags.lower():
                results.append(item)
    return results
