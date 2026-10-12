import os, re, datetime, requests, hashlib, json, time
from flask import Blueprint, request, jsonify
from openai import OpenAI
import tmdbsimple as tmdb

ai_summarizer = Blueprint("ai_summarizer", __name__)
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
tmdb.API_KEY = os.getenv("TMDB_API_KEY")

# --- In-memory cache {cache_key: {"timestamp": ..., "data": ...}}
CACHE = {}

VERIFIED_SOURCES = {
    "news": [
        "https://www.bbc.com/news",
        "https://www.reuters.com",
        "https://edition.cnn.com",
        "https://apnews.com",
        "https://www.nytimes.com/section/world",
    ],
    "documentary": [
        "https://www.nationalgeographic.com",
        "https://www.history.com",
        "https://www.pbs.org",
        "https://www.discovery.com",
    ],
}


def cache_get(key, ttl=3600):
    """Return cached data if valid."""
    entry = CACHE.get(key)
    if entry and time.time() - entry["timestamp"] < ttl:
        return entry["data"]
    return None


def cache_set(key, data):
    """Store cache data with timestamp."""
    CACHE[key] = {"timestamp": time.time(), "data": data}


def is_now_playing(start, end):
    try:
        now = datetime.datetime.utcnow()
        s = datetime.datetime.fromisoformat(start.replace("Z", "+00:00"))
        e = datetime.datetime.fromisoformat(end.replace("Z", "+00:00"))
        return s <= now <= e
    except Exception:
        return False


def enrich_movie_data(title):
    try:
        search = tmdb.Search()
        res = search.movie(query=title)
        if not res["results"]:
            res = search.tv(query=title)
        if not res["results"]:
            return None
        first = res["results"][0]
        details = (
            tmdb.Movies(first["id"]).info()
            if "title" in first
            else tmdb.TV(first["id"]).info()
        )

        cast_data = (
            tmdb.Movies(first["id"]).credits()
            if "title" in first
            else tmdb.TV(first["id"]).credits()
        )

        cast_list = [
            {
                "name": c["name"],
                "character": c.get("character", ""),
                "profile_path": f"https://image.tmdb.org/t/p/w200{c['profile_path']}"
                if c.get("profile_path")
                else None,
            }
            for c in cast_data.get("cast", [])[:10]
        ]

        return {
            "id": first["id"],
            "title": first.get("title") or first.get("name"),
            "overview": details.get("overview", ""),
            "release_date": details.get("release_date") or details.get("first_air_date"),
            "runtime": details.get("runtime") or details.get("episode_run_time", [None])[0],
            "genres": [g["name"] for g in details.get("genres", [])],
            "poster": f"https://image.tmdb.org/t/p/w500{details['poster_path']}"
            if details.get("poster_path")
            else None,
            "cast": cast_list,
            "link": f"https://www.themoviedb.org/{'movie' if 'title' in first else 'tv'}/{first['id']}",
        }
    except Exception as e:
        print("TMDb error:", e)
        return None


def get_wikipedia_summary(name):
    """Fetch Wikipedia summary for a person or topic."""
    try:
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{name.replace(' ', '_')}"
        r = requests.get(url, timeout=5)
        if r.status_code == 200:
            d = r.json()
            return {
                "title": d.get("title"),
                "extract": d.get("extract"),
                "url": d.get("content_urls", {}).get("desktop", {}).get("page"),
                "thumbnail": d.get("thumbnail", {}).get("source"),
            }
    except Exception as e:
        print("Wikipedia lookup failed:", e)
    return None


@ai_summarizer.route("/summarize_now", methods=["POST"])
def summarize_now():
    data = request.get_json()
    programs = data.get("programs", [])
    now_playing = [p for p in programs if is_now_playing(p.get("start", ""), p.get("end", ""))]

    if not now_playing:
        return jsonify({"summary_text": "No programs currently airing.", "verified_links": []})

    # caching key
    key = hashlib.md5(json.dumps(now_playing, sort_keys=True).encode()).hexdigest()
    cached = cache_get(key)
    if cached:
        return jsonify(cached)

    text = "\n".join(f"{p.get('title','')} - {p.get('description','')}" for p in now_playing)
    prompt = f"""
    Summarize what is currently airing across these channels.
    For each program, identify if it's News, Documentary, Movie, or Show.
    Provide a short paragraph summary.
    ---
    {text}
    """

    try:
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400,
            temperature=0.4,
        )
        summary_text = resp.choices[0].message.content.strip()
    except Exception as e:
        print("AI summarization failed:", e)
        summary_text = "Unable to summarize content."

    verified_links, enriched = [], []
    for p in now_playing:
        genre = (p.get("genre") or "").lower()
        title = p.get("title", "")

        # factual types
        if "news" in genre or "documentary" in genre:
            verified_links += VERIFIED_SOURCES.get(
                "news" if "news" in genre else "documentary", []
            )
        # movie/series enrichment
        elif any(x in genre for x in ["movie", "film", "series", "show"]):
            enriched_data = enrich_movie_data(title)
            if enriched_data:
                enriched.append(enriched_data)
                verified_links.append(enriched_data["link"])

    output = {
        "summary_text": summary_text,
        "verified_links": sorted(set(verified_links)),
        "enriched": enriched,
    }

    cache_set(key, output)
    return jsonify(output)


@ai_summarizer.route("/entity_info/<name>")
def entity_info(name):
    """
    Unified intelligence lookup for people, actors, politicians, or companies.
    Combines Wikipedia + recent news + optional AI summary.
    Cached for 1 hour.
    """
    key = f"entity:{name.lower()}"
    cached = cache_get(key)
    if cached:
        return jsonify(cached)

    # --- Wikipedia
    wiki = get_wikipedia_summary(name)

    # --- News (DuckDuckGo or GNews)
    try:
        news_resp = requests.get(
            f"https://gnews.io/api/v4/search?q={name}&token={os.getenv('GNEWS_API_KEY','demo')}&max=5&lang=en"
        )
        news_items = []
        if news_resp.ok:
            for n in news_resp.json().get("articles", [])[:5]:
                news_items.append({
                    "title": n.get("title"),
                    "url": n.get("url"),
                    "source": n.get("source", {}).get("name"),
                    "published": n.get("publishedAt", "")[:10]
                })
    except Exception as e:
        print("News fetch failed:", e)
        news_items = []

    # --- Optional TMDb filmography (if person)
    filmography = []
    try:
        search = tmdb.Search().person(query=name)
        if search["results"]:
            pid = search["results"][0]["id"]
            credits = tmdb.People(pid).movie_credits()
            filmography = [
                {"title": c.get("title"), "character": c.get("character"), "year": c.get("release_date", "")[:4]}
                for c in credits.get("cast", [])[:12]
            ]
    except Exception as e:
        print("TMDb person lookup failed:", e)

    # --- AI insight (optional)
    try:
        joined_news = "\n".join(f"{n['title']} ({n['source']})" for n in news_items)
        insight_prompt = f"Give a concise 2-3 sentence insight on why {name} might be relevant now based on this news:\n{joined_news or 'no news available'}"
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": insight_prompt}],
            max_tokens=120,
            temperature=0.6,
        )
        ai_insight = resp.choices[0].message.content.strip()
    except Exception as e:
        print("AI insight failed:", e)
        ai_insight = None

    data = {
        "wiki": wiki,
        "news": news_items,
        "filmography": filmography,
        "ai_insight": ai_insight,
    }

    cache_set(key, data)
    return jsonify(data)
