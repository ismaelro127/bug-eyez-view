import requests

def get_wikipedia_summary(name: str):
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
