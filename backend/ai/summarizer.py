import hashlib, json
from flask import Blueprint, request, jsonify
from .ai_client import client
from .cache import cache_get, cache_set
from .media_enricher import enrich_media

summarizer_bp = Blueprint("summarizer", __name__)

def is_now_playing(start, end):
    import datetime
    try:
        now = datetime.datetime.utcnow()
        s = datetime.datetime.fromisoformat(start.replace("Z", "+00:00"))
        e = datetime.datetime.fromisoformat(end.replace("Z", "+00:00"))
        return s <= now <= e
    except:
        return False

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


@summarizer_bp.route("/now", methods=["POST"])
def summarize_now():
    data = request.get_json()
    programs = data.get("programs", [])
    now_playing = [p for p in programs if is_now_playing(p.get("start", ""), p.get("end", ""))]

    if not now_playing:
        return jsonify({"summary_text": "No programs currently airing.", "verified_links": []})
    
    key = hashlib.md5(json.dumps(now_playing, sort_keys=True).encode()).hexdigest()
    cached = cache_get(key)
    if cached:
        return jsonify(cached)
    
    text = "\n".join(f"{p.get('title','')} - {p.get('description','')}" for p in now_playing)
    prompt = f"""
    Summarize what is currently airing across these channels.
    Identify if each program is News, Documentary, Movie, or Show and provide a short paragraph summary.
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
        if "news" in genre or "documentary" in genre:
            verified_links += VERIFIED_SOURCES.get(
                "news" if "news" in genre else "documentary", []
            )
        elif any(x in genre for x in ["movie", "film", "series", "show"]):
            enriched_data = enrich_media(title)
            if enriched_data:
                enriched.append(enriched_data)
                verified_links.append(enriched_data["link"])

    result = {
        "summary_text": summary_text,
        "verified_links": sorted(set(verified_links)),
        "enriched": enriched,
    }

    cache_set(key, result)
    return jsonify(result)
