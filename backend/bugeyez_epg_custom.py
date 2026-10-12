from requests_html import HTMLSession
import re
import pandas as pd

session = HTMLSession()
url = "https://www.tvinsider.com/network/lmn/schedule/"

# Load and render the page
response = session.get(url)
response.html.render(timeout=20)

# Find all EPG program blocks
program_blocks = response.html.find(".epg-program-item")

programs = []

for block in program_blocks:
    title_el = block.find(".epg-title", first=True)
    desc_el = block.find(".epg-description", first=True)
    
    title = title_el.text.strip() if title_el else ""
    description = desc_el.text.strip() if desc_el else ""
    
    # Determine type and extract season/episode
    content_type = "Movie"
    season = episode = None

    match = re.search(r"\(S(\d+), Ep (\d+)\)", description)
    if match:
        season = int(match.group(1))
        episode = int(match.group(2))
        content_type = "Show"

    programs.append({
        "Title": title,
        "Description": description,
        "Type": content_type,
        "Season": season,
        "Episode": episode
    })

# Convert to DataFrame and export
df = pd.DataFrame(programs)
df.to_csv("tvinsider_epg_lmn.csv", index=False)
print("✅ EPG data saved to tvinsider_epg_lmn.csv")
