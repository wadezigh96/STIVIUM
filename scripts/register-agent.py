#!/usr/bin/env python3
"""Register the STIVIUM qualifying provider with ERC-8004.

This script is intentionally operator-run. It never stores or commits a private key.
Set PRIVATE_KEY and WALLET_PASSWORD in the environment (or a local .env file) before use.

The resulting agentId and transaction hash are printed and should be recorded in
docs/evidence/SET-AND-EARN.md after verification.
"""
from __future__ import annotations

import argparse
import os

from dotenv import load_dotenv
from bnbagent import AgentEndpoint, ERC8004Agent, EVMWalletProvider


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--network",
        choices=("bsc-testnet", "bsc-mainnet"),
        default=os.getenv("NETWORK", "bsc-testnet"),
    )
    args = parser.parse_args()

    load_dotenv()

    password = os.getenv("WALLET_PASSWORD")
    private_key = os.getenv("PRIVATE_KEY")
    base_url = os.getenv("A2A_BASE_URL", "").rstrip("/")
    agent_name = os.getenv("AGENT_NAME", "STIVIUM Yield Guardian")
    agent_description = os.getenv(
        "AGENT_DESCRIPTION",
        "STIVIUM agent for bounded yield optimisation and on-chain ERC-8183 jobs.",
    )

    if not password:
        raise SystemExit("WALLET_PASSWORD is required")
    if not private_key:
        raise SystemExit("PRIVATE_KEY is required for the first registration run")
    if not base_url:
        raise SystemExit("A2A_BASE_URL must be the public provider base URL")
    if not base_url.startswith("https://"):
        raise SystemExit("A2A_BASE_URL must use HTTPS")

    wallet = EVMWalletProvider(
        password=password,
        private_key=private_key,
    )
    sdk = ERC8004Agent(
        network=args.network,
        wallet_provider=wallet,
    )

    agent_uri = sdk.generate_agent_uri(
        name=agent_name,
        description=agent_description,
        endpoints=[
            AgentEndpoint(
                name="A2A",
                endpoint=f"{base_url}/a2a",
                version="0.3.0",
            ),
            AgentEndpoint(
                name="ERC-8183",
                endpoint=f"{base_url}/erc8183/status",
                version="0.5.0",
            ),
            AgentEndpoint(
                name="Agent Card",
                endpoint=f"{base_url}/.well-known/agent-card.json",
                version="0.3.0",
            ),
        ],
    )

    result = sdk.register_agent(agent_uri=agent_uri)

    print("ERC-8004 registration complete")
    print(f"network: {args.network}")
    print(f"wallet: {wallet.address}")
    print(f"agent_id: {result['agentId']}")
    print(f"transaction_hash: {result['transactionHash']}")
    print(f"agent_uri: {agent_uri}")


if __name__ == "__main__":
    main()
