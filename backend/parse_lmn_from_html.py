# parse_lmn_from_html.py
import json
import re
from bs4 import BeautifulSoup
from datetime import datetime, timedelta

def clean(text):
    return text.strip().replace('\xa0', ' ').replace('\n', ' ')

def is_date(text):
    return re.match(r"^[A-Z][a-z]+,\s+[A-Z][a-z]+\s+\d{1,2}$", text)

def is_time(text):
    return re.match(r"^\d{1,2}:\d{2}\s?(AM|PM)$", text, re.IGNORECASE)

def should_skip(text):
    return any(k in text.lower() for k in ['advertising', 'paid programming', 'stream'])

def extract_epg(html):
    soup = BeautifulSoup(html, 'html.parser')
    lines = [clean(s) for s in soup.stripped_strings]

    epg = []
    current_date = None
    i = 0

    while i < len(lines):
        line = lines[i]

        if is_date(line):
            current_date = line
            i += 1
            continue

        if is_time(line) and current_date:
            time_str = line
            title = lines[i + 1] if i + 1 < len(lines) else ''
            desc = lines[i + 2] if i + 2 < len(lines) else ''

            if should_skip(title):
                i += 1
                continue

            try:
                start = datetime.strptime(f"{current_date} {time_str}", "%A, %B %d %I:%M %p")
                end = start + timedelta(hours=2)
            except:
                i += 1
                continue

            # Try to extract year/season/episode if available
            season, episode = None, None
            match = re.search(r'[Ss]eason\s*(\d+)[,\s]+[Ee]pisode\s*(\d+)', desc)
            if match:
                season, episode = int(match.group(1)), int(match.group(2))

            epg.append({
                "title": title,
                "description": desc if not should_skip(desc) else "",
                "start": start.isoformat(),
                "end": end.isoformat(),
                "season": season,
                "episode": episode
            })
            i += 3
        else:
            i += 1

    return epg

def main():
    with open("Lifetime Movie Network - TV Schedule & Listings Guide.html", "r", encoding="utf-8") as f:
        html = f.read()

    epg_data = {
        "channel_id": "LMN",
        "epg": extract_epg(html)
    }

    with open("lmn.json", "w", encoding="utf-8") as f:
        json.dump(epg_data, f, indent=2)

    print("✅ Extracted EPG entries:", len(epg_data["epg"]))
    print("✅ Output saved to lmn.json")

if __name__ == "__main__":
    main()
