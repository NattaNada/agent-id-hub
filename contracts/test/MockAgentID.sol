// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @notice Test-only mock of the SPACE ID Agent ID contract (ERC-721).
///         Real Agent ID is non-transferable; this mock is mintable so tests
///         can grant / withhold holder status per address. NEVER deploy on mainnet.
contract MockAgentID is ERC721 {
    uint256 private _nextId = 1;

    constructor() ERC721("Mock Agent ID", "MAI") {}

    function mint(address to) external returns (uint256 tokenId) {
        tokenId = _nextId++;
        _mint(to, tokenId);
    }
}
