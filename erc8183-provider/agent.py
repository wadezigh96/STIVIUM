import os
from bnbagent.erc8183.server import create_erc8183_app

def execute_job(job: dict) -> str:
    description = str(job.get("description", "")).strip()
    if not description:
        return "Stivium ERC-8183 provider received an empty task."
    return f"Stivium ERC-8183 provider processed task: {description}"

app = create_erc8183_app(on_job=execute_job)
