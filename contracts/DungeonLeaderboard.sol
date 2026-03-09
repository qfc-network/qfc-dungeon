// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DungeonLeaderboard {
    struct Run {
        address player;
        uint256 score;
        uint8 floor;
        uint16 turns;
        uint256 seed;
        uint256 timestamp;
    }
    
    Run[] public runs;
    mapping(address => uint256) public bestScore;
    mapping(address => uint256) public totalRuns;
    
    event RunCompleted(address indexed player, uint256 score, uint8 floor, uint16 turns, uint256 seed);
    event NewHighScore(address indexed player, uint256 score);
    
    function submitRun(uint256 score, uint8 floor, uint16 turns, uint256 seed) external {
        runs.push(Run({
            player: msg.sender,
            score: score,
            floor: floor,
            turns: turns,
            seed: seed,
            timestamp: block.timestamp
        }));
        
        totalRuns[msg.sender]++;
        
        if (score > bestScore[msg.sender]) {
            bestScore[msg.sender] = score;
            emit NewHighScore(msg.sender, score);
        }
        
        emit RunCompleted(msg.sender, score, floor, turns, seed);
    }
    
    function getSeed() external view returns (uint256) {
        return uint256(blockhash(block.number - 1));
    }
    
    function getRunCount() external view returns (uint256) {
        return runs.length;
    }
    
    function getTopRuns(uint256 count) external view returns (Run[] memory) {
        uint256 len = runs.length;
        if (count > len) count = len;
        
        // Simple: return latest runs (proper sorting would need off-chain indexer)
        Run[] memory top = new Run[](count);
        for (uint256 i = 0; i < count; i++) {
            top[i] = runs[len - 1 - i];
        }
        return top;
    }
}
