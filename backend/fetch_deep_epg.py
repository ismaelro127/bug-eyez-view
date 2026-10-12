import asyncio, json
from datetime import datetime, timedelta
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET

def safe(txt):
    if not txt:
        return ""
    return txt.replace("\xa0", " ").strip()

def add_end_times(programs):
    fmt = "%H:%M"
    result = []
    for i, p in enumerate(programs):
        try:
            start = datetime.strptime(p["time"], fmt)
        except:
            continue
        if i + 1 < len(programs):
            try:
                end = datetime.strptime(programs[i + 1]["time"], fmt)
                if end <= start:
                    end += timedelta(days=1)
            except:
                end = start + timedelta(minutes=30)
        else:
            end = start + timedelta(minutes=30)
        p["start"] = start.strftime(fmt)
        p["end"] = end.strftime(fmt)
        result.append(p)
    return result

def export_xmltv(cid, shows):
    root = ET.Element("tv")
    for s in shows:
        prog = ET.SubElement(
            root, "programme",
            {"channel": cid, "start": s.get("start", ""), "stop": s.get("end", "")}
        )
        ET.SubElement(prog, "title").text = safe(s.get("title"))
        if s.get("desc"):
            ET.SubElement(prog, "desc").text = safe(s.get("desc"))
    ET.ElementTree(root).write(f"{cid}_deep.xml", encoding="utf-8", xml_declaration=True)
    print(f"🧾 Wrote XMLTV → {cid}_deep.xml")

async def scrape_cgtn(url, channel_id):
    async with async_playwright() as p:
        browser = await p.firefox.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, wait_until="networkidle")
        await asyncio.sleep(5)  # let JS render
        html = await page.content()
        await browser.close()

    soup = BeautifulSoup(html, "html.parser")
    shows = []
    for prog in soup.select(".program, .schedule-item"):
        time_el = prog.select_one(".program-time, .time")
        title_el = prog.select_one(".program-title, .title")
        desc_el = prog.select_one(".program-desc, .description")
        if title_el and time_el:
            shows.append({
                "time": safe(time_el.get_text()),
                "title": safe(title_el.get_text()),
                "desc": safe(desc_el.get_text() if desc_el else "")
            })
    shows = add_end_times(shows)
    with open(f"{channel_id}_deep.json", "w", encoding="utf-8") as f:
        json.dump(shows, f, indent=2, ensure_ascii=False)
    export_xmltv(channel_id, shows)
    print(f"✅ Extracted {len(shows)} programmes for {channel_id}")
    return shows

async def scrape_france24(url, channel_id):
    async with async_playwright() as p:
        browser = await p.firefox.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url, wait_until="networkidle")
        await asyncio.sleep(5)
        html = await page.content()
        await browser.close()

    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(" ", strip=True)
    import re
    blocks = re.findall(r"(\d{1,2}:\d{2})\s+([A-Z][^0-9]+?)(?=\s+\d{1,2}:\d{2}|$)", text)
    shows = []
    for t, raw in blocks:
        title, desc = raw, ""
        if "By:" in raw:
            title, desc = raw.split("By:", 1)
        shows.append({"time": t, "title": safe(title), "desc": safe(desc)})
    shows = add_end_times(shows)
    with open(f"{channel_id}_deep.json", "w", encoding="utf-8") as f:
        json.dump(shows, f, indent=2, ensure_ascii=False)
    export_xmltv(channel_id, shows)
    print(f"✅ Extracted {len(shows)} programmes for {channel_id}")
    return shows

async def main():
    channels = {
        "cgtn_en": "https://www.cgtn.com/tv",
        # "france24_en": "https://www.france24.com/en/tv-guide"
    }

    for cid, url in channels.items():
        print(f"\n🔹 Fetching deep schedule for {cid} ...")
        if "cgtn" in cid:
            await scrape_cgtn(url, cid)
        else:
            await scrape_france24(url, cid)

if __name__ == "__main__":
    asyncio.run(main())
