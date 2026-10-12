import os
import jwt
import requests
from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS
from ai import summarizer, entity_info, finance_info

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────────────
# Secure API Gateway Configuration
# ─────────────────────────────────────────────

JWT_SECRET = os.getenv("JWT_SECRET")
INTERNAL_KEY = os.getenv("INTERNAL_API_KEY")
NODE_BASE = "http://127.0.0.1:5000"

def require_jwt():
    auth = request.headers.get("Authorization", "")
    print("AUTH HEADER:", auth)

    if not auth.startswith("Bearer "):
        print("❌ Missing Bearer")
        return None

    token = auth.split(" ", 1)[1]
    secret = os.getenv("JWT_SECRET")

    print("JWT_SECRET (flask):", secret)

    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        print("✅ JWT PAYLOAD:", payload)
        return payload
    except Exception as e:
        print("❌ JWT ERROR:", str(e))
        return None

@app.route("/")
def home():
    return jsonify({"status": "ok", "app": "Bug Eyez View AI backend"})

@app.route("/ai/entity/<etype>/<name>")
def entity_lookup(etype, name):
    return jsonify(entity_info.lookup_entity(etype, name))

@app.route("/ai/finance", methods=["POST"])
def finance_analyze():
    payload = request.get_json(force=True)
    return jsonify(finance_info.analyze_financial_sentiment(payload))

@app.route("/ai/summarize", methods=["POST"])
def ai_summarize():
    payload = request.get_json(force=True)
    return jsonify(summarizer.generate_summary(payload))

@app.get("/api/bugzcoin/balance")
def bugzcoin_balance():
    payload = require_jwt()
    if not payload:
        return jsonify({"error": "UNAUTHORIZED"}), 401

    email = payload.get("email")
    if not email:
        return jsonify({"error": "INVALID_TOKEN"}), 401

    r = requests.get(
        f"{NODE_BASE}/internal/bugzcoin/balance",
        params={"email": email},
        headers={"X-Internal-Key": INTERNAL_KEY},
        timeout=5
    )

    return (r.text, r.status_code, {"Content-Type": "application/json"})

@app.post("/api/ads/complete")
def ads_complete():
    payload = require_jwt()
    if not payload:
        return jsonify({"error": "UNAUTHORIZED"}), 401

    user_id = payload.get("email")

    if not user_id:
        return jsonify({"error": "INVALID_TOKEN"}), 401

    body = request.get_json(force=True)

    r = requests.post(
        f"{NODE_BASE}/internal/ads/complete",
        json={
            "userId": user_id,
            "adType": body.get("adType"),
            "proof": body.get("proof"),
        },
        headers={"X-Internal-Key": INTERNAL_KEY},
        timeout=5
    )

    return (r.text, r.status_code, {"Content-Type": "application/json"})

if __name__ == "__main__":
    app.run(port=5001, debug=False)
