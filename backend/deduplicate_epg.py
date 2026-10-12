import xml.etree.ElementTree as ET
import os

EPG_XML_PATH = "epg/global-epg.xml"
OUTPUT_PATH = "epg/global-epg-deduped.xml"

tree = ET.parse(EPG_XML_PATH)
root = tree.getroot()

# 1️⃣ Build map: id → [display-names]
id_to_names = {}
id_to_programmes = {}

for ch in root.findall('channel'):
    cid = ch.attrib['id']
    name = ch.findtext('display-name')
    id_to_names.setdefault(cid, set()).add(name)

for prog in root.findall('programme'):
    cid = prog.attrib['channel']
    id_to_programmes.setdefault(cid, []).append(prog)

# 2️⃣ Find max numeric ID to assign new ones
max_id = max(int(cid) for cid in id_to_names.keys())

# 3️⃣ Build new XML
new_root = ET.Element('tv', root.attrib)

for cid, names in id_to_names.items():
    if len(names) == 1:
        # No dup — keep as-is
        name = list(names)[0]
        ch = ET.SubElement(new_root, 'channel', {'id': cid})
        ET.SubElement(ch, 'display-name').text = name
        # Copy programmes
        for p in id_to_programmes.get(cid, []):
            new_root.append(p)
    else:
        # Has multiple names for same ID — split!
        for name in names:
            max_id += 1
            new_cid = str(max_id)
            ch = ET.SubElement(new_root, 'channel', {'id': new_cid})
            ET.SubElement(ch, 'display-name').text = name
            # Duplicate same programmes for this name
            for p in id_to_programmes.get(cid, []):
                new_p = ET.Element('programme', {
                    'channel': new_cid,
                    'start': p.attrib['start'],
                    'stop': p.attrib['stop']
                })
                for child in p:
                    new_p.append(child)
                new_root.append(new_p)

# 4️⃣ Write new XML
tree = ET.ElementTree(new_root)
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
tree.write(OUTPUT_PATH, encoding="utf-8", xml_declaration=True)

print(f"✅ Deduplicated EPG written to: {OUTPUT_PATH}")
