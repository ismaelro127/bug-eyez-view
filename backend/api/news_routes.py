# backend/api/news_routes.py

from fastapi import APIRouter, Query
from typing import Optional
from ..news_engine.storage import search_news
from ..news_engine.config import CATEGORIES

router = APIRouter(prefix="/api/news", tags=["News"])

@router.get("/")
def list_news(
    q: Optional[str] = Query(None, description="Search query keywords"),
    category: Optional[str] = Query("all", description="Filter by category")
):
    """
    Returns cached news results. If no query is provided, returns a random sample.
    """
    if q:
        results = search_news(q, category)
    else:
        # basic sampling for default feed
        results = []
        for cat in CATEGORIES:
            try:
                results.extend(search_news("", cat))
            except Exception:
                pass
        results = results[:50]

    return {"count": len(results), "results": results[:50]}
