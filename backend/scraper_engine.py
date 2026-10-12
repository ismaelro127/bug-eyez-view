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
