"""Paddock · plex-info: what the Films screen needs from your Plex library, and nothing else.

A small read-only service to run next to Plex (Docker, see compose.yaml). It reads the library
and returns titles, posters, summaries and cast. Your Plex token stays here, in .env: it is never
sent to the tablet; pictures go through /img, which adds the token on this side.

  GET /health                                    is the service up, is Plex reachable
  GET /sections                                  film and series libraries
  GET /library?section=Films&view=recent&limit=48
        view = recent (recently added) | unwatched | ondeck (continue watching) | all
  GET /item/<ratingKey>                          full sheet of one title
  GET /img?u=/library/metadata/…/thumb/…&w=300&h=450   poster or backdrop, resized by Plex

No dependency besides Python 3.10+.
"""
from __future__ import annotations

import json
import os
import ssl
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PLEX_URL = os.environ.get("PLEX_URL", "http://127.0.0.1:32400").rstrip("/")
PLEX_TOKEN = os.environ.get("PLEX_TOKEN", "").strip()
PORT = int(os.environ.get("PORT", "8098"))
_CTX = ssl.create_default_context()
_CACHE: dict[str, tuple[float, object]] = {}


def plex(path: str, params: dict | None = None, ttl: float = 60, raw: bool = False):
    """One call to the Plex API (JSON), with a small in-memory cache."""
    q = dict(params or {})
    url = f"{PLEX_URL}{path}" + (("?" + urllib.parse.urlencode(q)) if q else "")
    key = ("raw:" if raw else "") + url
    hit = _CACHE.get(key)
    if hit and time.time() - hit[0] < ttl:
        return hit[1]
    req = urllib.request.Request(url, headers={"Accept": "application/json", "X-Plex-Token": PLEX_TOKEN,
                                               "X-Plex-Product": "Paddock", "X-Plex-Client-Identifier": "paddock-plex-info"})
    with urllib.request.urlopen(req, timeout=12, context=_CTX) as r:
        if raw:
            data = (r.headers.get("Content-Type", "image/jpeg"), r.read())
        else:
            data = json.loads(r.read().decode("utf-8"))
    _CACHE[key] = (time.time(), data)
    if len(_CACHE) > 400:
        for k in sorted(_CACHE, key=lambda k: _CACHE[k][0])[:100]:
            _CACHE.pop(k, None)
    return data


def img(u: str | None, w: int, h: int) -> str | None:
    return f"/img?{urllib.parse.urlencode({'u': u, 'w': w, 'h': h})}" if u else None


def tags(m: dict, k: str, n: int = 6) -> list[str]:
    return [t.get("tag") for t in (m.get(k) or [])[:n] if t.get("tag")]


def summary(m: dict) -> dict:
    dur = m.get("duration") or 0
    off = m.get("viewOffset") or 0
    ep = m.get("type") == "episode"
    return {
        "key": m.get("ratingKey"), "type": m.get("type"), "title": m.get("title"), "year": m.get("year"),
        "library": m.get("librarySectionTitle"),
        "show": m.get("grandparentTitle") if ep else None,
        "durationMin": round(dur / 60000) if dur else None,
        "rating": m.get("audienceRating") or m.get("rating"), "contentRating": m.get("contentRating"),
        "genres": tags(m, "Genre", 3), "summary": m.get("summary") or "",
        "viewed": (m.get("viewCount") or 0) > 0, "progress": round(off / dur, 3) if dur and off else 0,
        "addedAt": m.get("addedAt"),
        "poster": img(m.get("grandparentThumb") if ep else m.get("thumb"), 300, 450),
        "backdrop": img(m.get("art"), 1280, 720),
    }


def sections() -> list[dict]:
    d = plex("/library/sections", ttl=600)
    return [{"key": s.get("key"), "title": s.get("title"), "type": s.get("type")}
            for s in d.get("MediaContainer", {}).get("Directory", []) if s.get("type") in ("movie", "show")]


def library(section: str | None, view: str, limit: int) -> dict:
    secs = sections()
    sec = next((s for s in secs if section and s["title"].lower() == section.lower()), None) \
        or next((s for s in secs if s["type"] == "movie"), None)
    if not sec:
        return {"section": None, "items": []}
    base = f"/library/sections/{sec['key']}"
    page = {"X-Plex-Container-Start": 0, "X-Plex-Container-Size": limit}
    if view == "ondeck":
        d = plex("/library/onDeck", page)
        items = [m for m in d.get("MediaContainer", {}).get("Metadata", []) if str(m.get("librarySectionID")) == str(sec["key"])]
    elif view == "unwatched":
        d = plex(f"{base}/all", {"unwatched": 1, "sort": "addedAt:desc", **page})
        items = d.get("MediaContainer", {}).get("Metadata", [])
    elif view == "all":
        d = plex(f"{base}/all", {"sort": "titleSort", **page}, ttl=300)
        items = d.get("MediaContainer", {}).get("Metadata", [])
    else:
        d = plex(f"{base}/all", {"sort": "addedAt:desc", **page})
        items = d.get("MediaContainer", {}).get("Metadata", [])
    return {"section": sec, "sections": secs, "view": view, "items": [summary(m) for m in items[:limit]]}


def item(key: str) -> dict:
    d = plex(f"/library/metadata/{int(key)}", ttl=300)
    m = (d.get("MediaContainer", {}).get("Metadata") or [{}])[0]
    out = summary(m)
    out.update({
        "summary": m.get("summary") or "", "tagline": m.get("tagline"), "studio": m.get("studio"),
        "released": m.get("originallyAvailableAt"), "genres": tags(m, "Genre", 6),
        "directors": tags(m, "Director", 3), "writers": tags(m, "Writer", 3), "countries": tags(m, "Country", 3),
        "cast": [{"name": r.get("tag"), "role": r.get("role"),
                  "photo": img(r.get("thumb"), 120, 120) if (r.get("thumb") or "").startswith("/") else r.get("thumb")}
                 for r in (m.get("Role") or [])[:10]],
        "poster": img(m.get("thumb"), 400, 600),
        "childCount": m.get("childCount"), "leafCount": m.get("leafCount"),
    })
    return out


class Handler(BaseHTTPRequestHandler):
    def _send(self, code: int, body: bytes, ctype: str = "application/json; charset=utf-8", cache: int = 0):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", f"public, max-age={cache}" if cache else "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _json(self, obj, code: int = 200):
        self._send(code, json.dumps(obj, ensure_ascii=False).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.end_headers()

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
        try:
            if u.path == "/health":
                ok = bool(PLEX_TOKEN)
                if ok:
                    try:
                        sections()
                    except Exception:  # noqa: BLE001
                        ok = False
                return self._json({"ok": True, "token": bool(PLEX_TOKEN), "plex": ok})
            if not PLEX_TOKEN:
                return self._json({"error": "PLEX_TOKEN is missing in .env"}, 503)
            if u.path == "/sections":
                return self._json(sections())
            if u.path == "/library":
                lim = max(1, min(120, int(q.get("limit", 48))))
                return self._json(library(q.get("section"), q.get("view", "recent"), lim))
            if u.path.startswith("/item/"):
                return self._json(item(u.path.split("/")[2]))
            if u.path == "/img":
                src = q.get("u", "")
                if not src.startswith("/library/"):
                    return self._json({"error": "invalid picture"}, 400)
                w, h = int(q.get("w", 300)), int(q.get("h", 450))
                ctype, data = plex("/photo/:/transcode", {"url": src, "width": w, "height": h, "minSize": 1, "upscale": 1}, ttl=3600, raw=True)
                return self._send(200, data, ctype, cache=86400)
            return self._json({"error": "not found"}, 404)
        except Exception as err:  # noqa: BLE001  (never the full URL: it would contain the token)
            return self._json({"error": type(err).__name__}, 502)

    def log_message(self, fmt, *args):  # log without the query string
        print(f"{self.command} {urllib.parse.urlparse(self.path).path} → {args[1] if len(args) > 1 else ''}", flush=True)


if __name__ == "__main__":
    print(f"paddock plex-info on :{PORT} → {PLEX_URL} (token {'set' if PLEX_TOKEN else 'MISSING'})", flush=True)
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
