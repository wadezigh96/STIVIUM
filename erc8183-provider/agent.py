import json

from bnbagent.erc8183.config import ERC8183Config
from erc8183_server import create_erc8183_app
from a2a_server import install_a2a
from task_engine import execute_task


def execute_job(job: dict) -> str:
    description = str(job.get("description", "")).strip()

    if not description:
        return json.dumps(
            {
                "status": "rejected",
                "reason": "empty_task_description",
            },
            separators=(",", ":"),
        )

    result = execute_task(description)

    deliverable = {
        "provider": "STIVIUM ERC-8183 provider",
        "job_id": job.get("jobId"),
        "task": description,
        "budget": job.get("budget"),
        "client": job.get("client"),
        "provider_address": job.get("provider"),
        "result": result,
    }

    return json.dumps(
        deliverable,
        separators=(",", ":"),
        sort_keys=True,
    )


config = ERC8183Config.from_env()
app = create_erc8183_app(
    config=config,
    on_job=execute_job,
)


install_a2a(app)
