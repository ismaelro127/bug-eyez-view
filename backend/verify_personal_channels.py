import argparse
import json
import shutil
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse

import requests

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
CHANNEL_FILE = BASE_DIR / "personal_channels.json"
EPG_REPORT_FILE = BASE_DIR / "personal_epg_report.json"
CACHE_FILE = BASE_DIR / "personal_channel_health_cache.json"
VERIFIED_FILE = BASE_DIR / "personal_channels_verified.json"
REPORT_FILE = BASE_DIR / "personal_channel_health_report.json"
FRONTEND_VERIFIED_FILE = PROJECT_DIR / "frontend" / "public" / "personal_channels_verified.json"

MAX_WORKERS = 10
CONNECT_TIMEOUT = 7
READ_TIMEOUT = 10
WORKING_TTL = 6 * 60 * 60
TRANSIENT_TTL = 30 * 60
HARD_FAILURE_TTL = 24 * 60 * 60
HEADERS = {"User-Agent": "Mozilla/5.0 (BugEyezView stream validator)", "Accept": "*/*"}
TRANSIENT_ERRORS = {"ConnectionError", "timeout", "SSLError", "server_error", "rate_limited"}
write_lock = threading.Lock()


def load_json(path, default):
    if not path.exists():
        return default
    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception as exc:
        print(f"Warning: could not read {path.name}: {exc}")
        return default


def save_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    with temp.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)
    temp.replace(path)


def detect_stream_type(url):
    path = urlparse(url).path.lower()
    if ".m3u8" in path: return "hls"
    if ".mpd" in path: return "dash"
    if ".m3u" in path: return "m3u"
    if ".flv" in path: return "flv"
    if ".ts" in path: return "mpegts"
    if ".mp4" in path: return "mp4"
    return "unknown"


def classify_http(status):
    if status in (401, 403, 451): return "restricted_or_geoblocked"
    if status in (404, 410): return "dead_or_expired"
    if status == 429: return "rate_limited"
    if status >= 500: return "server_error"
    return f"http_{status}"


def verify_stream(channel):
    url = channel.get("url", "").strip()
    result = {
        "url": url, "checked_at": int(time.time()), "working": False,
        "status": "unknown", "status_code": None, "content_type": "",
        "stream_type": detect_stream_type(url), "final_url": "",
        "error": "", "error_detail": "", "response_time_ms": None,
    }
    if not url.startswith(("http://", "https://")):
        result.update(status="unsupported", error="unsupported_url")
        return result

    started = time.perf_counter()
    try:
        with requests.get(url, headers=HEADERS, timeout=(CONNECT_TIMEOUT, READ_TIMEOUT), allow_redirects=True, stream=True) as response:
            result["status_code"] = response.status_code
            result["final_url"] = response.url
            result["content_type"] = response.headers.get("Content-Type", "").lower()
            result["response_time_ms"] = round((time.perf_counter() - started) * 1000)
            if not 200 <= response.status_code < 300:
                classification = classify_http(response.status_code)
                result.update(status=classification, error=classification)
                return result

            sample = b""
            for chunk in response.iter_content(chunk_size=2048):
                if chunk: sample += chunk
                if len(sample) >= 8192: break
            sample_lower = sample.lower()
            stream_type = result["stream_type"]
            content_type = result["content_type"]

            if stream_type in ("hls", "m3u"):
                valid = b"#extm3u" in sample_lower or "mpegurl" in content_type
            elif stream_type == "dash":
                valid = b"<mpd" in sample_lower or "dash+xml" in content_type
            else:
                media_markers = ("video/", "audio/", "mpegurl", "application/octet-stream", "application/vnd.apple.mpegurl")
                valid = any(marker in content_type for marker in media_markers) or bool(sample)

            if valid:
                result.update(working=True, status="working")
            else:
                result.update(status="invalid_stream", error="invalid_stream")
    except requests.Timeout as exc:
        result.update(status="timeout", error="timeout", error_detail=str(exc))
    except requests.exceptions.SSLError as exc:
        result.update(status="tls_error", error="SSLError", error_detail=str(exc))
    except requests.exceptions.ConnectionError as exc:
        result.update(status="connection_error", error="ConnectionError", error_detail=str(exc))
    except requests.RequestException as exc:
        result.update(status="request_error", error=exc.__class__.__name__, error_detail=str(exc))
    except Exception as exc:
        result.update(status="validator_error", error=exc.__class__.__name__, error_detail=str(exc))
    finally:
        if result["response_time_ms"] is None:
            result["response_time_ms"] = round((time.perf_counter() - started) * 1000)
    return result


def needs_check(previous, now, force=False):
    if force or previous is None: return True
    age = max(0, now - int(previous.get("checked_at") or 0))
    if previous.get("working"): return age >= WORKING_TTL
    if previous.get("error") in TRANSIENT_ERRORS or previous.get("status") in TRANSIENT_ERRORS:
        return age >= TRANSIENT_TTL
    return age >= HARD_FAILURE_TTL


def main(force=False, sync_frontend=True):
    channels = load_json(CHANNEL_FILE, [])
    epg_report = load_json(EPG_REPORT_FILE, [])
    cache = load_json(CACHE_FILE, {})
    if not isinstance(channels, list) or not channels:
        raise RuntimeError(f"No channels found in {CHANNEL_FILE}")

    epg_lookup = {e.get("url", ""): e for e in epg_report if isinstance(e, dict) and e.get("url")}
    now = int(time.time())
    pending = [c for c in channels if c.get("url", "").strip() and needs_check(cache.get(c.get("url", "").strip()), now, force)]
    print(f"Channels: {len(channels)} | Cached: {len(cache)} | Checking now: {len(pending)} | Workers: {MAX_WORKERS}")

    completed = recovered = failed = 0
    if pending:
        executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)
        futures = {executor.submit(verify_stream, channel): channel for channel in pending}
        try:
            for future in as_completed(futures):
                channel = futures[future]
                url = channel.get("url", "").strip()
                previous_working = bool(cache.get(url, {}).get("working"))
                try:
                    result = future.result()
                except Exception as exc:
                    result = {"url": url, "checked_at": int(time.time()), "working": False, "status": "worker_error", "error": "worker_error", "error_detail": str(exc), "status_code": None, "content_type": "", "stream_type": detect_stream_type(url), "final_url": "", "response_time_ms": None}
                with write_lock:
                    cache[url] = result
                    completed += 1
                    if result.get("working") and not previous_working: recovered += 1
                    if not result.get("working"): failed += 1
                    if completed % 25 == 0:
                        save_json(CACHE_FILE, cache)
                        print(f"Progress {completed}/{len(pending)} | recovered {recovered} | failed {failed}")
        except KeyboardInterrupt:
            print("Stopping scan; preserving completed results...")
        finally:
            save_json(CACHE_FILE, cache)
            executor.shutdown(wait=False, cancel_futures=True)

    verified_channels, health_report = [], []
    counts = {}
    for channel in channels:
        url = channel.get("url", "").strip()
        health = cache.get(url)
        if not health: continue
        epg = epg_lookup.get(url, {})
        combined = dict(channel)
        combined["health"] = health
        combined["has_epg"] = bool(epg.get("has_epg"))
        if combined["has_epg"]: combined["epg_sources"] = epg.get("epg_sources", [])
        health_report.append(combined)
        status = health.get("status") or ("working" if health.get("working") else health.get("error", "unknown"))
        counts[status] = counts.get(status, 0) + 1
        if health.get("working"): verified_channels.append(combined)

    save_json(REPORT_FILE, health_report)
    save_json(VERIFIED_FILE, verified_channels)
    if sync_frontend:
        FRONTEND_VERIFIED_FILE.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(VERIFIED_FILE, FRONTEND_VERIFIED_FILE)

    print("\nPersonal Channel Verification")
    print("---------------------------------")
    print(f"Catalog:  {len(channels)}")
    print(f"Verified: {len(verified_channels)}")
    print(f"Checked this run: {completed}")
    for status, count in sorted(counts.items(), key=lambda item: (-item[1], item[0])):
        print(f"{status:26} {count}")
    print(f"Backend verified:  {VERIFIED_FILE}")
    if sync_frontend: print(f"Frontend synced:   {FRONTEND_VERIFIED_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate and refresh Bug Eyez View personal channel health.")
    parser.add_argument("--force", action="store_true", help="Recheck every catalog URL regardless of cache age")
    parser.add_argument("--no-frontend-sync", action="store_true", help="Do not copy verified output into frontend/public")
    args = parser.parse_args()
    main(force=args.force, sync_frontend=not args.no_frontend_sync)
