# backend/news_engine/summarizer.py

from openai import OpenAI
import os

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY", "your_openai_key_here"))

def summarize_article(title, description):
    text = f"Title: {title}\n\nDescription: {description}"
    prompt = f"Summarize this in 2 sentences for a news dashboard:\n{text}"
    try:
        res = client.responses.create(model="gpt-5", input=prompt)
        return res.output_text.strip()
    except Exception:
        return description[:200] + "..."
