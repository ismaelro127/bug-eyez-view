import os
import tmdbsimple as tmdb
tmdb.API_KEY = os.getenv("TMDB_API_KEY")

def enrich_media(title):
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
        credits = (
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
            for c in credits.get("cast", [])[:10]
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
        print("TMDb enrichment failed:", e)
    return None
