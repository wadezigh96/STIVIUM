from __future__ import annotations

import os
import uuid
from typing import Any

from fastapi import Request
from fastapi.responses import JSONResponse
from bnbagent.utils import RateLimitExceeded, SlidingWindowLimiter


AGENT_NAME = os.getenv("AGENT_NAME", "STIVIUM Yield Guardian")
AGENT_DESCRIPTION = os.getenv(
    "AGENT_DESCRIPTION",
    "STIVIUM agent for bounded yield optimisation and on-chain ERC-8183 jobs.",
)
BASE_URL = os.getenv(
    "A2A_BASE_URL",
    os.getenv("ERC8183_AGENT_URL", "http://localhost:8003/erc8183")
).rstrip("/")

# A2A public endpoint is the provider root, while ERC8183_AGENT_URL
# normally points at /erc8183.
if BASE_URL.endswith("/erc8183"):
    BASE_URL = BASE_URL[:-8].rstrip("/")

AGENT_CARD: dict[str, Any] = {
    "protocolVersion": "0.3.0",
    "name": AGENT_NAME,
    "description": AGENT_DESCRIPTION,
    "url": f"{BASE_URL}/a2a",
    "preferredTransport": "JSONRPC",
    "version": "1.0.0",
    "capabilities": {
        "streaming": False,
        "pushNotifications": False,
    },
    "defaultInputModes": ["application/json"],
    "defaultOutputModes": ["application/json"],
    "category": "Yield Optimisation",
    "protocols": ["A2A", "ERC-8183"],
    "skills": [
        {
            "id": "negotiate-erc8183-job",
            "name": "Negotiate an ERC-8183 job",
            "description": (
                "Return a wallet-signed ERC-8183 price quote."
            ),
            "tags": ["erc8183", "negotiation", "bnb-chain"],
            "inputModes": ["application/json"],
            "outputModes": ["application/json"],
        },
        {
            "id": "yield-risk-ranking",
            "name": "Rank yield opportunities by risk-adjusted score",
            "description": "Compare supplied yield candidates using APY minus declared risk and return a deterministic ranking.",
            "tags": ["yield", "apy", "risk", "bnb-chain"],
            "inputModes": ["application/json"],
            "outputModes": ["application/json"],
        },
        {
            "id": "erc8183-job-status",
            "name": "ERC-8183 job status",
            "description": (
                "Read the status of an ERC-8183 job from the provider."
            ),
            "tags": ["erc8183", "status"],
            "inputModes": ["application/json"],
            "outputModes": ["application/json"],
        },
    ],
}


def install_a2a(app):
    rate_window = float(
        os.getenv("ERC8183_NEGOTIATE_RATE_WINDOW", "60")
    )
    rate_limit = int(
        os.getenv("ERC8183_NEGOTIATE_RATE_LIMIT", "120")
    )
    global_rate_limit = int(
        os.getenv("ERC8183_NEGOTIATE_GLOBAL_RATE_LIMIT", "1200")
    )

    negotiate_limiter = SlidingWindowLimiter(
        max_requests=max(1, rate_limit),
        window_seconds=max(1.0, rate_window),
        max_keys=10_000,
    )

    global_negotiate_limiter = SlidingWindowLimiter(
        max_requests=max(1, global_rate_limit),
        window_seconds=max(1.0, rate_window),
        max_keys=1,
    )

    @app.get("/.well-known/agent-card.json")
    async def agent_card():
        return AGENT_CARD

    def rpc_error(
        req_id: Any,
        code: int,
        message: str,
        status: int = 200,
    ):
        return JSONResponse(
            {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {
                    "code": code,
                    "message": message,
                },
            },
            status_code=status,
        )

    def agent_message(data: dict[str, Any]) -> dict[str, Any]:
        return {
            "kind": "message",
            "role": "agent",
            "messageId": str(uuid.uuid4()),
            "parts": [
                {
                    "kind": "data",
                    "data": data,
                }
            ],
        }

    def extract_data_part(
        message: dict[str, Any],
    ) -> dict[str, Any] | None:
        for part in message.get("parts", []):
            if (
                isinstance(part, dict)
                and part.get("kind") == "data"
                and isinstance(part.get("data"), dict)
            ):
                return part["data"]
        return None

    @app.post("/a2a")
    async def a2a_endpoint(request: Request):
        try:
            body = await request.json()
        except Exception:
            return rpc_error(
                None,
                -32700,
                "Parse error",
                status=400,
            )

        req_id = body.get("id")

        if body.get("jsonrpc") != "2.0" or "method" not in body:
            return rpc_error(
                req_id,
                -32600,
                "Invalid Request",
                status=400,
            )

        if body["method"] != "message/send":
            return rpc_error(
                req_id,
                -32601,
                f"Method not found: {body['method']}",
            )

        message = (body.get("params") or {}).get("message") or {}
        data = extract_data_part(message)

        if data is None:
            return rpc_error(
                req_id,
                -32602,
                "message must carry a data part with a 'skill' field",
            )

        skill = data.get("skill")
        state = request.app.state.erc8183

        if skill == "negotiate-erc8183-job":
            client_ip = (
                request.client.host
                if request.client
                else "unknown"
            )

            try:
                negotiate_limiter.check(client_ip)
                global_negotiate_limiter.check("global")
            except RateLimitExceeded:
                return rpc_error(
                    req_id,
                    -32000,
                    "Rate limited, retry later",
                )

            terms = data.get("terms")
            task_description = data.get("task_description")

            if (
                not isinstance(terms, dict)
                or not isinstance(task_description, str)
            ):
                return rpc_error(
                    req_id,
                    -32602,
                    "negotiate-erc8183-job requires "
                    "'task_description' (string) and 'terms' (object)",
                )

            try:
                result = state.negotiation_handler.negotiate(
                    {
                        "task_description": task_description,
                        "terms": terms,
                    }
                )
            except Exception:
                return rpc_error(
                    req_id,
                    -32603,
                    "Negotiation failed",
                )

            envelope = result.to_dict()
            envelope["provider_address"] = (
                state.job_ops.agent_address
            )

            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": agent_message(envelope),
            }

        if skill == "erc8183-job-status":
            job_id = data.get("job_id")

            if not isinstance(job_id, int):
                return rpc_error(
                    req_id,
                    -32602,
                    "erc8183-job-status requires "
                    "an integer 'job_id'",
                )

            try:
                job = await state.job_ops.get_job(job_id)
            except Exception:
                return rpc_error(
                    req_id,
                    -32603,
                    f"Job {job_id} lookup failed",
                )

            if job is None:
                return rpc_error(
                    req_id,
                    -32004,
                    f"Job {job_id} not found",
                )

            payload = {
                "job_id": job.id,
                "client": job.client,
                "provider": job.provider,
                "status": job.status.name,
                "budget": str(job.budget),
                "expired_at": job.expired_at,
                "submitted_at": job.submitted_at,
                "deliverable": (
                    "0x" + job.deliverable.hex()
                    if isinstance(job.deliverable, bytes)
                    else str(job.deliverable)
                ),
            }

            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": agent_message(payload),
            }

        return rpc_error(
            req_id,
            -32602,
            f"Unknown skill: {skill!r}",
        )

    return app
