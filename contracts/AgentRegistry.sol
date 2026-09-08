// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AgentRegistry
 * @notice Minimal on-chain registry for Stivium marketplace agents.
 *         Stores listing metadata; scoring (Rarity/Trending) stays off-chain
 *         or is fed later via an oracle / updater role.
 *
 * Deploy target: BNB Smart Chain testnet (97) or mainnet (56).
 */
contract AgentRegistry {
    // --- Types ---

    struct Agent {
        string  name;
        string  category;   // e.g. "Rebalancing", "Grid Trading"
        string  description;
        address owner;
        uint256 listedAt;
        bool    active;
        bool    verified;   // set by admin/updater
    }

    // --- Storage ---

    uint256 public nextId;
    mapping(uint256 => Agent) public agents;

    /// @dev Optional: track listings per owner for easy lookup
    mapping(address => uint256[]) private _ownerListings;

    address public admin;

    // --- Events ---

    event AgentListed(
        uint256 indexed id,
        string  name,
        string  category,
        address indexed owner
    );
    event AgentUpdated(uint256 indexed id, string name, bool active);
    event AgentVerified(uint256 indexed id, bool verified);
    event AdminChanged(address indexed previous, address indexed next);

    // --- Errors ---

    error NotAdmin();
    error NotOwner();
    error AgentNotFound();
    error EmptyName();

    // --- Modifiers ---

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    // --- Constructor ---

    constructor() {
        admin = msg.sender;
    }

    // --- Write ---

    /**
     * @notice List a new agent. Anyone can list (owner = msg.sender).
     */
    function listAgent(
        string calldata name,
        string calldata category,
        string calldata description
    ) external returns (uint256 id) {
        if (bytes(name).length == 0) revert EmptyName();

        id = nextId++;
        agents[id] = Agent({
            name:        name,
            category:    category,
            description: description,
            owner:       msg.sender,
            listedAt:    block.timestamp,
            active:      true,
            verified:    false
        });
        _ownerListings[msg.sender].push(id);

        emit AgentListed(id, name, category, msg.sender);
    }

    /**
     * @notice Owner can update name/description and pause/unpause.
     */
    function updateAgent(
        uint256 id,
        string calldata name,
        string calldata description,
        bool active
    ) external {
        Agent storage a = agents[id];
        if (a.owner == address(0) && a.listedAt == 0) revert AgentNotFound();
        if (msg.sender != a.owner) revert NotOwner();
        if (bytes(name).length == 0) revert EmptyName();

        a.name = name;
        a.description = description;
        a.active = active;

        emit AgentUpdated(id, name, active);
    }

    /**
     * @notice Admin marks an agent as verified (optional trust signal).
     */
    function setVerified(uint256 id, bool verified) external onlyAdmin {
        Agent storage a = agents[id];
        if (a.owner == address(0) && a.listedAt == 0) revert AgentNotFound();
        a.verified = verified;
        emit AgentVerified(id, verified);
    }

    function setAdmin(address next) external onlyAdmin {
        emit AdminChanged(admin, next);
        admin = next;
    }

    // --- Read ---

    function getAgent(uint256 id) external view returns (Agent memory) {
        return agents[id];
    }

    function listingsOf(address owner) external view returns (uint256[] memory) {
        return _ownerListings[owner];
    }

    function totalAgents() external view returns (uint256) {
        return nextId;
    }
}
