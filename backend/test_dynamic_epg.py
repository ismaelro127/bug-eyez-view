from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import re, asyncio, json
from playwright.async_api import async_playwright

async def fetch_dynamic_with_details(url, channel_id):
    async with async_playwright() as p:
        browser = await p.firefox.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, wait_until="networkidle")
        html = await page.content()
        await browser.close()
    return html

async def scrape_with_clicks(url, channel_id):
    from playwright.async_api import async_playwright
    import asyncio, json

    async with async_playwright() as p:
        browser = await p.firefox.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, wait_until="networkidle")
        await page.wait_for_selector(".program-item", timeout=15000)
        shows = []

        items = await page.query_selector_all(".program-item")
        for item in items:
            try:
                time_txt = await item.query_selector_eval(".time", "el => el.innerText") or ""
                title_txt = await item.query_selector_eval(".title", "el => el.innerText") or ""
                await item.click()
                await asyncio.sleep(0.5)
                desc = ""
                try:
                    desc = await page.query_selector_eval(".program-detail", "el => el.innerText")
                except:
                    pass
                shows.append({"time": time_txt.strip(), "title": title_txt.strip(), "desc": desc.strip()})
            except Exception as e:
                print(f"⚠️ Error parsing one item: {e}")
        await browser.close()
        with open(f"{channel_id}_deep.json", "w", encoding="utf-8") as f:
            json.dump(shows, f, ensure_ascii=False, indent=2)
        print(f"✅ Extracted {len(shows)} items for {channel_id}")
    return shows

def parse_schedule_with_details(html):
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(" ", strip=True)
    # Basic show split
    blocks = re.findall(r"(\d{1,2}:\d{2})\s+([A-Z0-9][^0-9]+?)(?=\s+\d{1,2}:\d{2}|$)", text)

    shows = []
    for time_str, raw_text in blocks:
        raw_text = re.sub(r"\s+", " ", raw_text).strip()
        desc, season, episode = "", None, None

        # Split "By:" if present
        if "By:" in raw_text:
            title, desc = raw_text.split("By:", 1)
        else:
            title = raw_text

        # Detect pattern like “Season 2, Episode 4” or “S2 E4”
        season_match = re.search(r"[Ss]eason\s*(\d+)", title)
        episode_match = re.search(r"(?:[Ee]pisode|E)\s*(\d+)", title)
        if season_match: season = int(season_match.group(1))
        if episode_match: episode = int(episode_match.group(1))

        shows.append({
            "time": time_str,
            "title": title.strip(),
            "desc": desc.strip(),
            "season": season,
            "episode": episode
        })
    return shows

def add_end_times(programs):
    fmt = "%H:%M"
    result = []
    for i, p in enumerate(programs):
        start = datetime.strptime(p["time"], fmt)
        if i + 1 < len(programs):
            end = datetime.strptime(programs[i + 1]["time"], fmt)
            if end <= start:
                end += timedelta(days=1)
        else:
            end = start + timedelta(minutes=30)
        p["start"] = start.strftime(fmt)
        p["end"] = end.strftime(fmt)
        result.append(p)
    return result

def export_xmltv(cid, shows):
    import xml.etree.ElementTree as ET
    root = ET.Element("tv")
    for s in shows:
        prog = ET.SubElement(root, "programme", {
            "channel": cid,
            "start": s["start"],
            "stop": s["end"]
        })
        ET.SubElement(prog, "title").text = s["title"]
        if s.get("desc"):
            ET.SubElement(prog, "desc").text = s["desc"]
        if s.get("season") or s.get("episode"):
            epnum = f"S{s['season'] or 0:02d}E{s['episode'] or 0:02d}"
            ET.SubElement(prog, "episode-num", {"system": "onscreen"}).text = epnum
    ET.ElementTree(root).write(f"{cid}_epg.xml", encoding="utf-8", xml_declaration=True)
    print(f"🧾 Wrote XMLTV → {cid}_epg.xml")

async def main():
    test_channels = {
        "france24_en": "https://www.france24.com/en/tv-guide",
        "cgtn_en": "https://www.cgtn.com/tv"
    }

    for cid, url in test_channels.items():
        print(f"🔹 Fetching {cid}: {url}")
        html = await fetch_dynamic_with_details(url, cid)
        shows = parse_schedule_with_details(html)
        shows = add_end_times(shows)
        with open(f"{cid}_full.json", "w", encoding="utf-8") as f:
            json.dump(shows, f, indent=2, ensure_ascii=False)
        export_xmltv(cid, shows)
        print(f"✅ Parsed {len(shows)} entries for {cid}")

asyncio.run(main())
