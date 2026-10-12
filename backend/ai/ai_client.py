import os
from dotenv import load_dotenv
import requests

load_dotenv()

OPENAI_KEY = os.getenv("OPENAI_API_KEY")
GNEWS_KEY = os.getenv("GNEWS_API_KEY")

if OPENAI_KEY:
    from openai import OpenAI
    client = OpenAI(api_key=OPENAI_KEY)
else:
    client = None
    print("⚠️ No OpenAI key found, AI client disabled. Using GNews fallback.")

def get_fallback_summary(topic):
    """Simple GNews-based fallback summarizer."""
    if not GNEWS_KEY:
        return {"summary": "AI summarizer offline (no keys provided)"}
    try:
        r = requests.get(f"https://gnews.io/api/v4/search?q={topic}&token={GNEWS_KEY}")
        articles = r.json().get("articles", [])
        if not articles:
            return {"summary": "No news found for this topic."}
        top = articles[0]
        return {
            "summary": f"Top news from {top['source']['name']}: {top['title']} — {top['description']}",
            "url": top["url"],
        }
    except Exception as e:
        return {"summary": f"Error retrieving GNews data: {e}"}
