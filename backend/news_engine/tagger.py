# backend/news_engine/tagger.py

import re
import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", "your_openai_key_here"))

def tag_article(text: str):
    """Use AI to extract keywords, sentiment, and entities."""
    if not text.strip():
        return {"tags": [], "sentiment": "neutral", "entities": []}

    try:
        prompt = f"Extract 3-5 keywords, main entities, and sentiment (positive/neutral/negative) from: {text}"
        response = client.responses.create(model="gpt-5", input=prompt)
        result = response.output_text

        # Parse results
        tags = re.findall(r'"([^"]+)"', result)
        sentiment = "neutral"
        if "positive" in result.lower(): sentiment = "positive"
        elif "negative" in result.lower(): sentiment = "negative"

        return {"tags": tags[:6], "sentiment": sentiment, "entities": tags[:3]}
    except Exception as e:
        print(f"⚠️ Tagging failed: {e}")
        return {"tags": [], "sentiment": "neutral", "entities": []}
