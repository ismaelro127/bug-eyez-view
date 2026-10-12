
import requests
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET

def scrape_3abn_schedule():
    url = 'https://3abn.org/schedule.html'  # Example
    response = requests.get(url)
    soup = BeautifulSoup(response.content, 'html.parser')

    programmes = []
    for row in soup.select('table tr'):
        cols = row.find_all('td')
        if len(cols) >= 2:
            start_time = cols[0].get_text(strip=True)
            title = cols[1].get_text(strip=True)
            programmes.append((start_time, title))

    tv = ET.Element('tv')
    channel = ET.SubElement(tv, 'channel', id='3ABN_English')
    ET.SubElement(channel, 'display-name').text = '3ABN English'

    for start_time, title in programmes:
        programme = ET.SubElement(tv, 'programme',
            channel='3ABN_English',
            start=f'{start_time} +0000',
            stop=f'{start_time} +0000'
        )
        ET.SubElement(programme, 'title').text = title

    ET.ElementTree(tv).write('custom_epg.xml', encoding='utf-8', xml_declaration=True)
    print('✅ Saved custom_epg.xml')

if __name__ == '__main__':
    scrape_3abn_schedule()
