import os, requests

def fetch_recent_news(query: str):
    try:
        token = os.getenv("GNEWS_API_KEY", "demo")
        resp = requests.get(
            f"https://gnews.io/api/v4/search?q={query}&token={token}&max=5&lang=en"
        )
        if resp.ok:
            return [
                {
                    "title": n.get("title"),
                    "url": n.get("url"),
                    "source": n.get("source", {}).get("name"),
                    "published": n.get("publishedAt", "")[:10],
                }
                for n in resp.json().get("articles", [])[:5]
            ]
    except Exception as e:
        print("News fetch failed:", e)
    return []
