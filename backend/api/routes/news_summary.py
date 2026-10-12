# backend/api/routes/news_summary.py
import os, json, glob
from fastapi import APIRouter
from typing import List, Dict
from backend.ai.summarizer import summarize_text  # your summarizer module
from backend.ai.entities import extract_entities

router = APIRouter()

NEWS_CACHE_DIR = os.path.join("backend", "news_cache")

def read_cached_articles(limit: int = 100) -> List[Dict]:
    """Read locally cached news JSON files."""
    articles = []
    for file in glob.glob(os.path.join(NEWS_CACHE_DIR, "*.json")):
        try:
            with open(file, "r", encoding="utf-8") as f:
                data = json.load(f)
                articles.extend(data.get("results", []))
        except Exception:
            continue
    return sorted(articles, key=lambda x: x.get("publishedAt", ""), reverse=True)[:limit]



@router.get("/api/summary")
def summarize_today():
    local_articles = read_cached_articles()
    live_articles = []  # disabled for now
    merged = local_articles + live_articles

    if not merged:
        return {"summary": "No data available", "highlights": [], "entities": [], "sources": []}

    # Prepare content for summarization
    all_titles = "\n".join(a.get("title", "") for a in merged if a.get("title"))
    summary = summarize_text(all_titles[:5000])
    highlights = [a.get("title") for a in merged[:10] if a.get("title")]
    sources = list({a.get("source", {}).get("name", "Unknown") for a in merged})

    # 🧠 Extract entities from AI summary
    entities = extract_entities(summary)

    return {
        "summary": summary,
        "highlights": highlights,
        "entities": entities,
        "sources": sources,
        "count": len(merged),
    }

