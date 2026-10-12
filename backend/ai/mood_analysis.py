def derive_market_mood(summary: str, price: float, change: float) -> str:
    """Simple mood classifier based on tone and price movement."""
    text = summary.lower()
    if change > 0.5 or "growth" in text or "strong" in text:
        return "Positive"
    elif change < -0.5 or "decline" in text or "loss" in text:
        return "Negative"
    return "Neutral"
