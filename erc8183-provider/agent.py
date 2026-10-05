import json

from bnbagent.erc8183.server import create_erc8183_app

from task_engine import execute_task


def execute_job(job: dict) -> str:
    description = str(job.get("description", "")).strip()
    if not description:
        return json.dumps({
            "status": "rejected",
            "reason": "empty_task_description",
        }, separators=(",", ":"))

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
    return json.dumps(deliverable, separators=(",", ":"), sort_keys=True)


app = create_erc8183_app(on_job=execute_job)
