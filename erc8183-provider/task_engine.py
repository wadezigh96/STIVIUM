import json
import math
import re
from typing import Any


def _json_from_description(description: str) -> dict[str, Any]:
    match = re.search(r"\{.*\}", description, re.DOTALL)
    if not match:
        return {}
    try:
        value = json.loads(match.group(0))
        return value if isinstance(value, dict) else {}
    except json.JSONDecodeError:
        return {}


def _grid(description: str, data: dict[str, Any]) -> dict[str, Any]:
    price = float(data.get("price", 0))
    lower = float(data.get("lower", 0))
    upper = float(data.get("upper", 0))
    levels = int(data.get("levels", 0))
    if price <= 0 or lower <= 0 or upper <= lower or levels < 2:
        return {
            "status": "needs_input",
            "required": "JSON fields price, lower, upper, levels (levels >= 2)",
        }
    step = (upper - lower) / (levels - 1)
    grid = [round(lower + i * step, 8) for i in range(levels)]
    nearest = min(range(len(grid)), key=lambda i: abs(grid[i] - price))
    return {
        "status": "ok",
        "strategy": "linear-grid",
        "current_price": price,
        "range": [lower, upper],
        "levels": levels,
        "step": round(step, 8),
        "grid": grid,
        "nearest_level": nearest + 1,
        "nearest_price": grid[nearest],
    }


def _health(description: str, data: dict[str, Any]) -> dict[str, Any]:
    collateral = float(data.get("collateral", 0))
    debt = float(data.get("debt", 0))
    liquidation_threshold = float(data.get("liquidation_threshold", 0))
    if collateral <= 0 or debt <= 0 or liquidation_threshold <= 0:
        return {
            "status": "needs_input",
            "required": "JSON fields collateral, debt, liquidation_threshold",
        }
    hf = (collateral * liquidation_threshold) / debt
    return {
        "status": "ok",
        "health_factor": round(hf, 6),
        "liquidation_buffer_pct": round(max(0, (hf - 1) * 100), 4),
        "risk": "critical" if hf < 1.05 else "high" if hf < 1.2 else "watch" if hf < 1.5 else "buffered",
        "action": "reduce debt or add collateral" if hf < 1.5 else "monitor",
    }


def _yield(description: str, data: dict[str, Any]) -> dict[str, Any]:
    candidates = data.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        return {
            "status": "needs_input",
            "required": "JSON field candidates: [{name, apy, risk}]",
        }
    rows = []
    for item in candidates:
        if not isinstance(item, dict):
            continue
        try:
            name = str(item["name"])
            apy = float(item["apy"])
            risk = float(item["risk"])
        except (KeyError, TypeError, ValueError):
            continue
        score = apy - risk
        rows.append({"name": name, "apy": apy, "risk": risk, "risk_adjusted_score": round(score, 6)})
    rows.sort(key=lambda x: x["risk_adjusted_score"], reverse=True)
    return {"status": "ok", "ranking": rows}


def execute_task(description: str) -> dict[str, Any]:
    data = _json_from_description(description)
    lowered = description.lower()
    if any(word in lowered for word in ("grid", "trading", "price range")):
        return {"task_type": "grid_trading", "output": _grid(description, data)}
    if any(word in lowered for word in ("health factor", "liquidation", "collateral", "debt")):
        return {"task_type": "health_factor", "output": _health(description, data)}
    if any(word in lowered for word in ("yield", "apy", "apr", "lending")):
        return {"task_type": "yield_optimisation", "output": _yield(description, data)}
    return {
        "task_type": "general",
        "output": {
            "status": "accepted",
            "note": "Task received. Provide structured JSON inputs for grid, health-factor, or yield analysis.",
        },
    }
