#!/usr/bin/env python3
"""Refresh live-snapshot.json from 8004scan + Binance Vision."""
from __future__ import annotations

import json
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "live-snapshot.json"

QUERIES = {
    "Rebalancing": "portfolio rebalancing BNB chain",
    "Grid Trading": "grid trading bot pancakeswap BNB",
    "Yield Optimisation": "Yield Router Venus PancakeSwap",
    "Health Factor Monitoring": "health factor venus lending",
}
PREFERRED = {
    "Yield Optimisation": "Yield Router",
    "Health Factor Monitoring": "smart-money-health-factor-agent",
}


def get(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "StiviumLiveRefresh/1.0"})
    with urllib.request.urlopen(req, timeout=20) as res:
        return json.loads(res.read().decode())


def pick(cat: str, items: list[dict]) -> dict | None:
    want = PREFERRED.get(cat)
    if want:
        for item in items:
            if item.get("name") == want:
                return item
    for item in items:
        if item.get("chain_id") in (56, 97):
            return item
    return items[0] if items else None


def slim(cat: str, item: dict) -> dict:
    return {
        "cat": cat,
        "name": item.get("name"),
        "description": (item.get("description") or "")[:320],
        "agent_id": item.get("agent_id"),
        "chain_id": item.get("chain_id"),
        "is_verified": bool(item.get("is_verified")),
        "x402_supported": bool(item.get("x402_supported")),
        "total_score": item.get("total_score") or 0,
        "star_count": item.get("star_count") or 0,
        "created_at": item.get("created_at"),
        "owner_address": item.get("owner_address"),
    }


def main() -> None:
    samples = []
    for cat, query in QUERIES.items():
        url = "https://api.8004scan.io/api/v1/agents/search/semantic?q=" + urllib.parse.quote(query)
        data = get(url)
        item = pick(cat, data.get("items") or [])
        if item:
            samples.append(slim(cat, item))

    listing = get("https://api.8004scan.io/api/v1/agents?chain_id=56&limit=1")
    prices = {}
    for symbol, key in (
        ("BNBUSDT", "BNB"),
        ("ETHUSDT", "ETH"),
        ("BTCUSDT", "BTCB"),
        ("CAKEUSDT", "CAKE"),
        ("USDCUSDT", "USDC"),
    ):
        tick = get("https://data-api.binance.vision/api/v3/ticker/price?symbol=" + symbol)
        prices[key] = float(tick["price"])
    prices["WBNB"] = prices["BNB"]
    prices["USDT"] = 1

    snap = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "registry": {
            "chain_id": 56,
            "indexed_agents": listing.get("total"),
            "source": "https://api.8004scan.io/api/v1/agents",
        },
        "prices_usdt": prices,
        "live_samples": samples,
    }
    OUT.write_text(json.dumps(snap, indent=2) + "\n")
    print("wrote", OUT, "index", snap["registry"]["indexed_agents"], "samples", len(samples))


if __name__ == "__main__":
    main()
