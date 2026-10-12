import time

CACHE = {}

def cache_get(key, ttl=3600):
    entry = CACHE.get(key)
    if entry and time.time() - entry["timestamp"] < ttl:
        return entry["data"]
    return None

def cache_set(key, data):
    CACHE[key] = {"timestamp": time.time(), "data": data}
