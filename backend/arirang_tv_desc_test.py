# -*- coding: utf-8 -*-
"""
Arirang TV – Description Fetch Test
-----------------------------------
✅ Fetches real program descriptions from Arirang /tv pages.
✅ Uses Playwright (non-headless) for full React rendering.
✅ Outputs clean JSON (frontend/public/epg/arirang_tv/arirang_tv_static.json)
"""

import os, json, asyncio, logging
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger("arirang_desc_test")

# ----------------------------
# Fetch description for a single page
# ----------------------------
async def fetch_description(prog_url: str) -> str:
    """Render full Arirang React page and extract visible program description."""
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=False, slow_mo=200)
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/121.0.0.0 Safari/537.36"
                )
            )
            page = await context.new_page()
            await page.goto(prog_url, timeout=90000)

            # Wait for dynamically rendered content
            await page.wait_for_selector(".contentBox_info", timeout=20000)

            desc_html = await page.inner_html(".contentBox_info")
            await browser.close()

            soup = BeautifulSoup(desc_html, "html.parser")
            text = soup.get_text(" ", strip=True)
            return " ".join(text.split())

    except Exception as e:
        logger.warning(f"⚠️ Failed desc fetch {prog_url}: {e}")
        return ""

# ----------------------------
# Main Test Runner
# ----------------------------
async def main():
    urls = [
        "https://www.arirang.com/tv/154",  # K-stage 'PAN'
        "https://www.arirang.com/tv/60",   # Exploring Korean Literature A
    ]

    results = []
    for url in urls:
        desc = await fetch_description(url)
        logger.info(f"✅ {url} → {desc[:100]}...")
        results.append({"url": url, "description": desc})

    # Save result for reference
    out_dir = os.path.join("frontend", "public", "epg", "arirang_tv")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "arirang_tv_static.json")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    logger.info(f"📦 Saved {len(results)} descriptions → {out_path}")

# ----------------------------
if __name__ == "__main__":
    asyncio.run(main())
