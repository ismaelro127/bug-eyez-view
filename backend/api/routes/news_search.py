from fastapi import APIRouter, Query
import random

router = APIRouter()

FAKE_ARTICLES = [
    {
        "title": "AI Revolution Accelerates Global Change",
        "description": "Experts discuss how artificial intelligence is transforming industries worldwide.",
        "source": "Global Times",
        "url": "https://example.com/ai-revolution",
    },
    {
        "title": "World Leaders Meet for UN Summit",
        "description": "The United Nations assembly discusses sustainable development and peace efforts.",
        "source": "BBC World",
        "url": "https://example.com/un-summit",
    },
    {
        "title": "Tech Giants Race Toward Quantum Computing",
        "description": "Companies like Google and IBM reveal new breakthroughs in quantum chip design.",
        "source": "Reuters",
        "url": "https://example.com/quantum-computing",
    },
]

@router.get("/api/news/search")
def search_news(query: str = Query(..., min_length=2)):
    """Mock search endpoint for entity-based news center."""
    results = random.sample(FAKE_ARTICLES, k=min(len(FAKE_ARTICLES), 2))
    return {"results": results}
