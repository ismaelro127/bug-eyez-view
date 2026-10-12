import spacy
from collections import defaultdict

# Load spaCy English model once
nlp = spacy.load("en_core_web_sm")

# Define allowed entity types
ALLOWED_LABELS = {"PERSON", "ORG", "GPE", "LOC", "EVENT", "PRODUCT"}

# Basic alias mapping (expand later)
ALIASES = {
    "USA": "United States",
    "U.S.": "United States",
    "U.S.A.": "United States",
    "US": "United States",
    "NYC": "New York",
    "UN": "United Nations",
    "AI": "Artificial Intelligence"
}

def normalize_entity(text: str) -> str:
    """Normalize text by aliasing and title-casing."""
    text = text.strip()
    if not text:
        return ""
    # Replace alias if exists
    if text.upper() in ALIASES:
        text = ALIASES[text.upper()]
    # Title case for consistency
    if len(text) > 2 and not text.isupper():
        text = text.title()
    return text

def extract_entities(text: str):
    """Extract, normalize, and deduplicate named entities."""
    if not text or len(text.strip()) == 0:
        return []

    doc = nlp(text)
    found = defaultdict(set)  # label → {entity texts}

    for ent in doc.ents:
        if ent.label_ in ALLOWED_LABELS:
            clean = normalize_entity(ent.text)
            if clean and len(clean) > 2:
                found[ent.label_].add(clean)

    # Flatten + deduplicate across labels
    merged = []
    seen = set()
    for label, values in found.items():
        for val in values:
            if val.lower() not in seen:
                merged.append({"text": val, "label": label})
                seen.add(val.lower())

    # Sort entities by label (ORG first, then others)
    label_order = ["ORG", "PERSON", "EVENT", "PRODUCT", "GPE", "LOC"]
    merged.sort(key=lambda e: label_order.index(e["label"]) if e["label"] in label_order else 99)

    return merged
