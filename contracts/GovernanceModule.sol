// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title GovernanceModule - Updated for OpenZeppelin v5.4.0
 * @dev Handles DAO governance with proposal creation and voting
 */
contract GovernanceModule is AccessControl {
    // Remove Counters and SafeMath - use built-in overflow protection
    uint256 private _proposalIdCounter;
    
    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");
    
    enum ProposalStatus { Pending, Active, Succeeded, Executed, Defeated }
    enum VoteType { Against, For, Abstain }
    
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint256 startBlock;
        uint256 endBlock;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
        string ipfsHash;
    }
    
    mapping(uint256 => Proposal) public proposals;
    mapping(address => uint256) public votingPower;
    mapping(address => mapping(uint256 => bool)) public hasVoted;
    
    uint256 public votingDelay = 1;
    uint256 public votingPeriod = 1000;
    uint256 public proposalThreshold = 1;
    
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string description,
        uint256 startBlock,
        uint256 endBlock,
        string ipfsHash
    );
    
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        VoteType support,
        uint256 votes
    );
    
    event ProposalExecuted(uint256 indexed proposalId);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNOR_ROLE, msg.sender);
    }
    
    function propose(
        string memory description,
        string memory ipfsHash
    ) external onlyRole(GOVERNOR_ROLE) returns (uint256) {
        require(
            votingPower[msg.sender] >= proposalThreshold,
            "Insufficient voting power"
        );
        
        _proposalIdCounter++;
        uint256 proposalId = _proposalIdCounter;
        
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.description = description;
        newProposal.startBlock = block.number + votingDelay;
        newProposal.endBlock = block.number + votingPeriod;
        newProposal.ipfsHash = ipfsHash;
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            description,
            newProposal.startBlock,
            newProposal.endBlock,
            ipfsHash
        );
        
        return proposalId;
    }
    
    function castVote(
        uint256 proposalId,
        VoteType support
    ) external {
        require(votingPower[msg.sender] > 0, "No voting power");
        require(!hasVoted[msg.sender][proposalId], "Already voted");
        
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id == proposalId, "Proposal does not exist");
        require(
            block.number >= proposal.startBlock &&
            block.number <= proposal.endBlock,
            "Voting period not active"
        );
        
        uint256 votes = votingPower[msg.sender];
        
        if (support == VoteType.For) {
            proposal.forVotes += votes;
        } else if (support == VoteType.Against) {
            proposal.againstVotes += votes;
        } else if (support == VoteType.Abstain) {
            proposal.abstainVotes += votes;
        }
        
        hasVoted[msg.sender][proposalId] = true;
        
        emit VoteCast(msg.sender, proposalId, support, votes);
    }
    
    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.id == proposalId, "Proposal does not exist");
        require(block.number > proposal.endBlock, "Voting period not ended");
        require(!proposal.executed, "Proposal already executed");
        
        bool passed = proposal.forVotes > proposal.againstVotes;
        require(passed, "Proposal did not pass");
        
        proposal.executed = true;
        
        emit ProposalExecuted(proposalId);
    }
    
    function state(uint256 proposalId) external view returns (ProposalStatus) {
        require(_proposalIdCounter >= proposalId, "Proposal does not exist");
        
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.executed) {
            return ProposalStatus.Executed;
        } else if (block.number <= proposal.startBlock) {
            return ProposalStatus.Pending;
        } else if (block.number <= proposal.endBlock) {
            return ProposalStatus.Active;
        } else if (proposal.forVotes <= proposal.againstVotes) {
            return ProposalStatus.Defeated;
        } else {
            return ProposalStatus.Succeeded;
        }
    }
    
    function setVotingParameters(
        uint256 _votingDelay,
        uint256 _votingPeriod,
        uint256 _proposalThreshold
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        votingDelay = _votingDelay;
        votingPeriod = _votingPeriod;
        proposalThreshold = _proposalThreshold;
    }
    
    function setVotingPower(
        address account,
        uint256 power
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        votingPower[account] = power;
    }
}