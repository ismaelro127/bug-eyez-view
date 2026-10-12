
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup

def parse_xmltv(url, tv):
    print(f"🔗 Downloading public XMLTV: {url} ...")
    response = requests.get(url)
    if response.status_code != 200:
        print(f"❌ Failed to fetch {url} — Status {response.status_code}")
        return
    try:
        xml = ET.fromstring(response.content)
    except ET.ParseError:
        print(f"❌ Parse error — {url} returned invalid XML.")
        return

    for child in xml:
        tv.append(child)
    print(f"✅ Merged {url}")

def parse_3abn(scrape_url, tv):
    print(f"🔗 Scraping 3ABN from {scrape_url} ...")
    response = requests.get(scrape_url)
    soup = BeautifulSoup(response.content, 'html.parser')

    channel_id = "3ABN_English"
    channel = ET.SubElement(tv, 'channel', id=channel_id)
    ET.SubElement(channel, 'display-name').text = '3ABN English'

    for row in soup.select('table tr'):
        cols = row.find_all('td')
        if len(cols) >= 2:
            start_time = cols[0].get_text(strip=True)
            title = cols[1].get_text(strip=True)
            programme = ET.SubElement(tv, 'programme',
                channel=channel_id,
                start=f'{start_time} +0000',
                stop=f'{start_time} +0000'
            )
            ET.SubElement(programme, 'title').text = title

    print(f"✅ Added 3ABN")

def parse_cbs(scrape_url, tv):
    print(f"🔗 Simulated CBS scrape from {scrape_url} ...")
    channel_id = "CBS_Sports"
    channel = ET.SubElement(tv, 'channel', id=channel_id)
    ET.SubElement(channel, 'display-name').text = 'CBS Sports'

    programme = ET.SubElement(tv, 'programme',
        channel=channel_id,
        start='20250625090000 +0000',
        stop='20250625100000 +0000'
    )
    ET.SubElement(programme, 'title').text = 'Sample CBS Show'

    print(f"✅ Added CBS Sports")

# scraper_engine.py - UPDATED
import json
import xml.etree.ElementTree as ET
from scrapers import parse_xmltv, parse_3abn, parse_cbs  # add more if needed

parsers = {
    "parse_xmltv": parse_xmltv,
    "parse_3abn": parse_3abn,
    "parse_cbs": parse_cbs,
    # Add your future scrapers here
}

with open('sources.json') as f:
    sources = json.load(f)

tv = ET.Element('tv')

for src in sources:
    func = parsers.get(src['parser'])
    if func:
        func(src['scrape_url'], tv)

tree = ET.ElementTree(tv)
tree.write('custom_epg.xml', encoding='utf-8')
print("✅ custom_epg.xml generated!")
