# backend/routes/ai_summary.py
from flask import Blueprint, request, jsonify
import openai
from datetime import datetime

ai_summary = Blueprint("ai_summary", __name__)

@ai_summary.route("/channel-summary", methods=["POST"])
def summarize_channel():
    data = request.get_json() or {}

    channel_name = data.get("channelName", "")
    provider = data.get("provider", "")
    description = data.get("description", "")
    category = data.get("category", "")
    recent_titles = data.get("recentTitles", [])

    context = f"""
Channel name: {channel_name}
Provider: {provider}
Category: {category}

Description:
{description}

Recent stream titles:
{", ".join(recent_titles)}
"""

    prompt = f"""
You are generating a factual, high-level overview for a live streaming channel.

Rules:
- Describe the type of content this channel typically streams
- Do NOT invent schedules or times
- Do NOT say "next", "later", or specific hours
- Be honest and neutral
- If information is limited, say so

Write 2–4 sentences.

---
{context}
"""

    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=200,
        temperature=0.3
    )

    summary_text = response["choices"][0]["message"]["content"].strip()

    return jsonify({
        "summary": summary_text,
        "confidence": 0.75,
        "source": "ai",
        "generatedAt": datetime.utcnow().isoformat()
    })
