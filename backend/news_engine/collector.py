# backend/news_engine/collector.py

import requests, json, os
from datetime import datetime
from .config import NEWS_API_KEY, CATEGORIES, CACHE_DIR
from .tagger import tag_article
from .storage import save_articles

def fetch_news(category="general", page_size=20):
    """Pull latest headlines from NewsAPI"""
    url = (
        f"https://newsapi.org/v2/top-headlines?"
        f"language=en&category={category}&pageSize={page_size}&apiKey={NEWS_API_KEY}"
    )
    res = requests.get(url)
    data = res.json()
    articles = data.get("articles", [])
    print(f"🗞️ {len(articles)} {category} articles fetched")
    return articles

def run_collector():
    all_articles = []
    for cat in CATEGORIES:
        articles = fetch_news(cat)
        tagged = []
        for art in articles:
            text = f"{art.get('title','')} {art.get('description','')}"
            meta = tag_article(text)
            art.update(meta)
            art["category"] = cat
            art["fetched_at"] = datetime.utcnow().isoformat()
            tagged.append(art)
        save_articles(tagged, cat)
        all_articles.extend(tagged)

    print(f"✅ Total {len(all_articles)} articles processed and cached.")

if __name__ == "__main__":
    run_collector()
