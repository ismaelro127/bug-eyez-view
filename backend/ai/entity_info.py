import os
import requests
import wikipediaapi
from flask import Blueprint, jsonify
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create the Flask Blueprint
entity_bp = Blueprint("entity", __name__)

# 🔹 Wikipedia setup
APP_NAME = "BugEyezViewAI/1.0 (contact: support@bugeyez.ai)"
try:
    WIKI = wikipediaapi.Wikipedia(user_agent=APP_NAME, language="en")
    print("✅ Wikipedia initialized successfully")
except Exception as e:
    print(f"⚠️ Wikipedia API init failed: {e}")
    WIKI = None

# 🔹 GNews fallback setup
GNEWS_KEY = os.getenv("GNEWS_API_KEY")

def get_wiki_summary(name: str):
    """Fetch summary and link from Wikipedia."""
    if not WIKI:
        return None
    try:
        page = WIKI.page(name)
        if page.exists():
            desc = page.summary.strip()
            if len(desc) > 500:
                desc = desc[:500] + "..."
            return {
                "name": name,
                "description": desc,
                "source": "wikipedia",
                "links": [{"label": "Full article", "url": page.fullurl}],
            }
    except Exception as e:
        print(f"⚠️ Wikipedia lookup failed for {name}: {e}")
    return None

def get_gnews_summary(name: str):
    """Fetch the most recent headline using GNews."""
    if not GNEWS_KEY:
        return None
    try:
        url = f"https://gnews.io/api/v4/search?q={name}&token={GNEWS_KEY}&lang=en"
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
        print(f"⚠️ GNews lookup failed for {name}: {e}")
    return None

@entity_bp.route("/ai/entity/<etype>/<name>")
def entity_lookup(etype, name):
    """Unified info endpoint: Wikipedia + GNews."""
    wiki_info = get_wiki_summary(name)
    news_info = get_gnews_summary(name)

    return jsonify({
        "entity": name,
        "type": etype,
        "summary": wiki_info or {"description": "No Wikipedia info found"},
        "recent_news": news_info or {"description": "No recent headlines"},
    })
