import xml.etree.ElementTree as ET
import os
import string

# Load the XML
tree = ET.parse('epg/global-epg.xml')
root = tree.getroot()

# Prepare buckets A–Z
grouped_channels = {letter: [] for letter in string.ascii_uppercase}
grouped_programs = {letter: [] for letter in string.ascii_uppercase}

# Group channels by first letter of display-name
for channel in root.findall('channel'):
    name_elem = channel.find('display-name')
    name = name_elem.text.strip() if name_elem is not None else channel.attrib.get('id', 'Unknown')
    first_letter = name[0].upper()

    if first_letter in grouped_channels:
        grouped_channels[first_letter].append(channel)

# Group programmes by first letter of their channel id
for programme in root.findall('programme'):
    channel_id = programme.attrib.get('channel', '')
    first_letter = channel_id[0].upper()

    if first_letter in grouped_programs:
        grouped_programs[first_letter].append(programme)

# Output folder
output_folder = 'epg_chunks'
os.makedirs(output_folder, exist_ok=True)

# Save each group as separate XML
for letter in string.ascii_uppercase:
    new_root = ET.Element('tv')

    for ch in grouped_channels[letter]:
        new_root.append(ch)
    for pr in grouped_programs[letter]:
        new_root.append(pr)

    tree_out = ET.ElementTree(new_root)
    output_file = os.path.join(output_folder, f'epg_{letter}.xml')
    tree_out.write(output_file, encoding='utf-8', xml_declaration=True)

print("✅ Split complete. Chunks saved in:", output_folder)
