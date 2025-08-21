// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./ProjectFactory.sol";
import "./InvestmentManager.sol";

/**
 * @title YieldDistributor - Updated for OpenZeppelin v5.4.0
 * @dev Handles profit distribution without admin controls
 */
contract YieldDistributor is ReentrancyGuard {
    
    struct Distribution {
        uint256 projectId;
        uint256 totalAmount;
        uint256 timestamp;
        bytes32 merkleRoot;
        string ipfsHash;
        address proposer;
        bool executed;
    }
    
    ProjectFactory public immutable projectFactory;
    InvestmentManager public immutable investmentManager;
    
    mapping(uint256 => Distribution[]) public projectDistributions;
    mapping(bytes32 => bool) public claimed;
    mapping(uint256 => uint256) public totalDistributed;
    
    event DistributionProposed(
        uint256 indexed projectId, 
        uint256 distributionIndex,
        uint256 amount, 
        bytes32 merkleRoot,
        address proposer
    );
    
    event YieldClaimed(
        address indexed investor, 
        uint256 indexed projectId, 
        uint256 amount
    );
    
    event DistributionExecuted(
        uint256 indexed projectId,
        uint256 distributionIndex,
        uint256 totalAmount
    );
    
    constructor(address _projectFactory, address payable _investmentManager) {
        require(_projectFactory != address(0), "Invalid project factory");
        require(_investmentManager != address(0), "Invalid investment manager");
        
        projectFactory = ProjectFactory(_projectFactory);
        investmentManager = InvestmentManager(_investmentManager);
    }
    
    function proposeDistribution(
        uint256 projectId,
        uint256 totalAmount,
        bytes32 merkleRoot,
        string memory ipfsHash
    ) external payable nonReentrant {
        require(totalAmount > 0, "Amount must be greater than 0");
        require(merkleRoot != 0, "Invalid merkle root");
        require(msg.value >= totalAmount, "Insufficient funds sent");
        
        // Use getter function instead of direct mapping access
        ProjectFactory.Project memory project = projectFactory.getProject(projectId);
        require(project.id != 0, "Project does not exist");
        require(project.farmer == msg.sender, "Only project farmer can propose distribution");
        
        Distribution memory newDistribution = Distribution({
            projectId: projectId,
            totalAmount: totalAmount,
            timestamp: block.timestamp,
            merkleRoot: merkleRoot,
            ipfsHash: ipfsHash,
            proposer: msg.sender,
            executed: false
        });
        
        projectDistributions[projectId].push(newDistribution);
        uint256 distributionIndex = projectDistributions[projectId].length - 1;
        
        emit DistributionProposed(
            projectId, 
            distributionIndex,
            totalAmount, 
            merkleRoot,
            msg.sender
        );
    }
    
    function claimYield(
        uint256 projectId,
        uint256 distributionIndex,
        uint256 amount,
        bytes32[] calldata merkleProof
    ) external nonReentrant {
        require(distributionIndex < projectDistributions[projectId].length, "Invalid distribution");
        
        Distribution storage distribution = projectDistributions[projectId][distributionIndex];
        require(distribution.totalAmount > 0, "Distribution does not exist");
        
        bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
        require(
            MerkleProof.verify(merkleProof, distribution.merkleRoot, leaf),
            "Invalid merkle proof"
        );
        
        bytes32 claimId = keccak256(abi.encodePacked(distribution.merkleRoot, msg.sender));
        require(!claimed[claimId], "Already claimed");
        
        claimed[claimId] = true;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Yield transfer failed");
        
        totalDistributed[projectId] += amount;
        
        emit YieldClaimed(msg.sender, projectId, amount);
    }
    
    function markDistributionExecuted(uint256 projectId, uint256 distributionIndex) external {
        require(distributionIndex < projectDistributions[projectId].length, "Invalid distribution");
        
        Distribution storage distribution = projectDistributions[projectId][distributionIndex];
        require(!distribution.executed, "Already executed");
        
        uint256 remainingBalance = address(this).balance;
        uint256 claimedAmount = distribution.totalAmount - remainingBalance;
        
        if (claimedAmount >= distribution.totalAmount / 2) {
            distribution.executed = true;
            emit DistributionExecuted(projectId, distributionIndex, distribution.totalAmount);
        }
    }
    
    function emergencyRefund(uint256 projectId, uint256 distributionIndex) external nonReentrant {
        require(distributionIndex < projectDistributions[projectId].length, "Invalid distribution");
        
        Distribution storage distribution = projectDistributions[projectId][distributionIndex];
        require(distribution.proposer == msg.sender, "Only proposer can refund");
        require(
            block.timestamp >= distribution.timestamp + 365 days,
            "Refund only after 365 days"
        );
        
        uint256 refundAmount = address(this).balance;
        require(refundAmount > 0, "No funds to refund");
        
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "Refund failed");
        
        distribution.executed = true;
    }
    
    // View functions
    function getProjectDistributions(uint256 projectId) external view returns (Distribution[] memory) {
        return projectDistributions[projectId];
    }
    
    function isClaimed(bytes32 merkleRoot, address account) external view returns (bool) {
        bytes32 claimId = keccak256(abi.encodePacked(merkleRoot, account));
        return claimed[claimId];
    }
    
    function getTotalDistributed(uint256 projectId) external view returns (uint256) {
        return totalDistributed[projectId];
    }
    
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    function getDistribution(
        uint256 projectId, 
        uint256 distributionIndex
    ) external view returns (
        uint256 totalAmount,
        uint256 timestamp,
        bytes32 merkleRoot,
        string memory ipfsHash,
        address proposer,
        bool executed
    ) {
        require(distributionIndex < projectDistributions[projectId].length, "Invalid distribution");
        
        Distribution memory dist = projectDistributions[projectId][distributionIndex];
        return (
            dist.totalAmount,
            dist.timestamp,
            dist.merkleRoot,
            dist.ipfsHash,
            dist.proposer,
            dist.executed
        );
    }
    
    receive() external payable {}
    
    fallback() external payable {}
}