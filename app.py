"""
Bitcoin Mini Analytics — one-file FastAPI app

What it is
- Ultra-simple web app to track BTC price, fee estimates, and a personal watchlist of Bitcoin addresses.
- Logs lightweight analytics events so you can practice DE/BI on real app exhaust data.
- Single file for fastest setup; uses SQLite (sqlmodel) and public APIs.

Run it
- Python 3.10+
- pip install -U fastapi uvicorn[standard] httpx sqlmodel pydantic
- uvicorn app:app --reload
- Visit http://127.0.0.1:8000

Public APIs used (no keys required)
- Price: CoinGecko Simple Price
- Fees: mempool.space API
- Address summary: Blockstream.info API

Notes
- This is a starter; extend schemas or add auth as you like.
"""

from __future__ import annotations
from datetime import datetime
from typing import Optional, Dict, Any, List

import json
import re

import os

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from pydantic import BaseModel, Field
from sqlmodel import SQLModel, Field as SQLField, Session, create_engine, select

# ----------------------------
# Data models (SQLModel / Pydantic)
# ----------------------------

class Event(SQLModel, table=True):
    id: Optional[int] = SQLField(default=None, primary_key=True)
    ts: datetime = SQLField(index=True, default_factory=datetime.utcnow)
    event_type: str = SQLField(index=True)
    user_id: Optional[str] = SQLField(index=True, default=None)
    payload_json: Optional[str] = None  # store raw JSON string for flexibility

class WatchItem(SQLModel, table=True):
    id: Optional[int] = SQLField(default=None, primary_key=True)
    created_at: datetime = SQLField(default_factory=datetime.utcnow)
    address: str = SQLField(index=True)
    label: Optional[str] = None

# Request schemas
class EventIn(BaseModel):
    event_type: str
    user_id: Optional[str] = None
    payload: Optional[Dict[str, Any]] = None

class WatchIn(BaseModel):
    address: str = Field(..., description="Bitcoin address (mainnet)")
    label: Optional[str] = None

# ----------------------------
# App + DB setup
# ----------------------------

app = FastAPI(title="Bitcoin Mini Analytics")
DB_PATH = os.getenv("DB_PATH", "./data/btcmini.db")
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL:
    engine = create_engine(DATABASE_URL, echo=False)
else:
    engine = create_engine(f"sqlite:///{DB_PATH}", echo=False)
SQLModel.metadata.create_all(engine)

# ----------------------------
# Helpers
# ----------------------------

MAINNET_ADDR_RE = re.compile(r"^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,87}$")

async def fetch_json(url: str, timeout: float = 10.0) -> Any:
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.json()

# ----------------------------
# Quantum Exposure helpers
# ----------------------------
EXPOSED_TYPES = {"p2pk", "v1_p2tr"}
HASHED_TYPES = {"p2pkh", "v0_p2wpkh"}

def infer_addr_type(addr: str) -> str:
    addr = addr.lower()
    if addr.startswith("bc1p"): return "p2tr"
    if addr.startswith("bc1q"): return "p2wpkh_or_wsh"
    if addr.startswith("1"): return "p2pkh"
    if addr.startswith("3"): return "p2sh"
    return "unknown"

def classify_script_type(script_type: Optional[str]) -> str:
    if not script_type:
        return "unknown"
    st = script_type.lower()
    if st in EXPOSED_TYPES:
        return "exposed"
    if st in HASHED_TYPES:
        return "hashed"
    return "unknown"

# ----------------------------
# HTML (single-file, CDN assets only)
# ----------------------------

# INDEX_HTML moved to standalone file: index.html

# ----------------------------
# Routes: UI
# ----------------------------

@app.get("/", response_class=FileResponse)
async def index():
    return FileResponse("index.html")

# ----------------------------
# Routes: Public API proxies
# ----------------------------

@app.get("/api/price")
async def get_price():
    """Get BTC-USD from CoinGecko simple price."""
    data = await fetch_json("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd")
    try:
        usd = float(data["bitcoin"]["usd"])  # type: ignore[index]
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Bad price data: {e}")
    return {"usd": usd}

@app.get("/api/fees")
async def get_fees():
    """Mempool.space fee estimates (mainnet)."""
    data = await fetch_json("https://mempool.space/api/v1/fees/recommended")
    # typical fields: fastestFee, halfHourFee, hourFee, economyFee
    return data

# ----------------------------
# Watchlist: store addresses and enrich with on-chain summary via Blockstream API
# ----------------------------

def _validate_btc_addr(addr: str) -> bool:
    return bool(MAINNET_ADDR_RE.match(addr))

async def _address_summary(addr: str) -> Dict[str, Any]:
    # Blockstream API: https://blockstream.info/api/address/{addr}
    url = f"https://blockstream.info/api/address/{addr}"
    data = await fetch_json(url)
    # Normalize to BTC units
    chain_stats = data.get("chain_stats", {})
    mempool_stats = data.get("mempool_stats", {})
    funded = (chain_stats.get("funded_txo_sum", 0) + mempool_stats.get("funded_txo_sum", 0)) / 1e8
    spent = (chain_stats.get("spent_txo_sum", 0) + mempool_stats.get("spent_txo_sum", 0)) / 1e8
    received_btc = funded
    balance_btc = max(received_btc - spent, 0)
    return {
        "received_btc": received_btc,
        "balance_btc": balance_btc,
    }

@app.post("/api/watchlist")
async def add_watch(item: WatchIn):
    if not _validate_btc_addr(item.address):
        raise HTTPException(status_code=400, detail="Invalid Bitcoin address format (mainnet)")
    # Upsert by address+label uniqueness (simplify: allow duplicates but avoid exact dup)
    with Session(engine) as s:
        exists = s.exec(select(WatchItem).where(WatchItem.address == item.address, WatchItem.label == item.label)).first()
        if exists:
            return JSONResponse({"ok": True, "id": exists.id})
        wi = WatchItem(address=item.address, label=item.label)
        s.add(wi)
        s.commit()
        s.refresh(wi)
        return {"ok": True, "id": wi.id}

@app.get("/api/watchlist")
async def list_watch():
    out: List[Dict[str, Any]] = []
    with Session(engine) as s:
        items = s.exec(select(WatchItem).order_by(WatchItem.created_at.asc())).all()
        for wi in items:
            summary = {}
            try:
                summary = await _address_summary(wi.address)
            except Exception:
                summary = {"received_btc": None, "balance_btc": None}
            out.append({
                "id": wi.id, "label": wi.label, "address": wi.address, **summary
            })
    return out

@app.get("/api/address/{addr}")
async def refresh_address(addr: str):
    if not _validate_btc_addr(addr):
        raise HTTPException(status_code=400, detail="Invalid Bitcoin address format")
    # just passthrough the summary for now
    try:
        summary = await _address_summary(addr)
        return summary
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Upstream error")

# ----------------------------
# Quantum Exposure: API route
# ----------------------------

@app.get("/api/quantum_exposure/{addr}")
async def quantum_exposure(addr: str):
    """Assess whether an address's current UTXOs expose a public key at rest (Taproot/P2PK),
    and flag address reuse for hash-based addresses that may have revealed the pubkey previously.
    Limits analysis to first 50 UTXOs for performance.
    """
    if not _validate_btc_addr(addr):
        raise HTTPException(status_code=400, detail="Invalid Bitcoin address format (mainnet)")

    try:
        addr_info = await fetch_json(f"https://blockstream.info/api/address/{addr}")
        utxos = await fetch_json(f"https://blockstream.info/api/address/{addr}/utxo")
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail="Upstream error")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Failed to query upstream: {e}")

    analyzed = []
    exposed_value = 0.0
    for u in utxos[:50]:  # cap analysis
        txid = u.get("txid")
        vout_index = u.get("vout")
        value_btc = (u.get("value", 0) or 0) / 1e8
        script_type = None
        try:
            tx = await fetch_json(f"https://blockstream.info/api/tx/{txid}")
            vouts = tx.get("vout", [])
            if isinstance(vouts, list) and vout_index is not None and vout_index < len(vouts):
                script_type = vouts[vout_index].get("scriptpubkey_type")
        except Exception:
            script_type = None
        risk = classify_script_type(script_type)
        if risk == "exposed":
            exposed_value += value_btc
        analyzed.append({
            "txid": txid,
            "vout": vout_index,
            "value_btc": value_btc,
            "scriptpubkey_type": script_type,
            "risk": risk,
        })

    addr_type_hint = infer_addr_type(addr)
    chain_stats = addr_info.get("chain_stats", {}) if isinstance(addr_info, dict) else {}
    spent_txo_count = int(chain_stats.get("spent_txo_count", 0) or 0)
    # If address was reused and is hash-based, its pubkey may already be exposed in previous spends
    reuse_pubkey_exposed = (spent_txo_count > 0) and (addr_type_hint in ("p2pkh", "p2wpkh_or_wsh")) and (len(analyzed) > 0)

    if any(utxo.get("risk") == "exposed" for utxo in analyzed):
        overall = "high"
    elif reuse_pubkey_exposed:
        overall = "elevated"
    else:
        overall = "low"

    notes = []
    if reuse_pubkey_exposed:
        notes.append("Address appears reused: its public key may already be on-chain; remaining funds at this address inherit that exposure.")
    if overall == "high":
        notes.append("Some UTXOs are Taproot/P2PK (public key in script). Consider moving to a fresh P2WPKH (bc1q...) until PQ schemes exist.")

    return {
        "address": addr,
        "address_type_hint": addr_type_hint,
        "overall_risk": overall,
        "exposed_value_btc": exposed_value,
        "analyzed_utxos": len(analyzed),
        "utxos": analyzed,
        "notes": notes,
    }

# ----------------------------
# Analytics events ingestion + super-basic aggregates
# ----------------------------

@app.post("/api/event")
async def log_event(evt: EventIn):
    with Session(engine) as s:
        rec = Event(event_type=evt.event_type, user_id=evt.user_id, payload_json=json.dumps(evt.payload or {}))
        s.add(rec)
        s.commit()
        s.refresh(rec)
        return {"ok": True, "id": rec.id}

@app.get("/api/metrics/events_by_type")
async def events_by_type():
    with Session(engine) as s:
        # SQLite aggregate
        rows = s.exec("""
            SELECT event_type, COUNT(*) as n
            FROM event
            GROUP BY event_type
            ORDER BY n DESC
        """).all()
        return [{"event_type": r[0], "n": r[1]} for r in rows]

@app.get("/healthz")
async def healthz():
    return {"ok": True, "time": datetime.utcnow().isoformat()}
