// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Interface for InvestmentManager
interface IInvestmentManager {
    function releaseFundsToFarmer(uint256 projectId, address farmer, uint256 amount) external;
}

/**
 * @title ProjectFactory - SIMPLIFIED PRECISION VERSION
 * @dev Simplified precision logic to avoid computational issues
 */
contract ProjectFactory is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    uint256 private _projectIdCounter;
    uint256 private _userCounter;
    
    // Project status enum
    enum ProjectStatus { Active, Completed, Cancelled, FundsReleased }
    
    // User profile structure
    struct UserProfile {
        bool isRegistered;
        string name;
        string profileIPFSHash;
        uint256 registeredAt;
        uint256 projectCount;
        uint256 totalInvested;
        uint256 totalRaised;
    }
    
    // Project structure
    struct Project {
        uint256 id;
        address farmer;
        string title;
        string description;
        string imageIPFSHash;
        string documentsIPFSHash;
        uint256 targetAmountUSDC;
        uint256 currentAmountUSDC;
        uint256 durationDays;
        uint256 createdAt;
        uint256 deadline;
        ProjectStatus status;
        string location;
        string category;
        uint256 investorCount;
        bool fundsReleased;
        uint256 fundsReleasedAt;
    }
    
    // Investment tracking
    struct Investment {
        address investor;
        uint256 amount;
        uint256 timestamp;
        bool claimed;
    }
    
    // State variables
    mapping(uint256 => Project) public projects;
    mapping(address => UserProfile) public userProfiles;
    mapping(address => uint256[]) public userProjects;
    mapping(uint256 => Investment[]) public projectInvestments;
    mapping(address => uint256[]) public userInvestments;
    
    // Investment manager interface
    IInvestmentManager public investmentManager;
    
    // 🎯 SIMPLIFIED CONSTANTS - Only essential ones
    uint256 public constant MIN_FUNDING_AMOUNT = 10 * 1e6; // 10 USDC
    uint256 public constant MAX_FUNDING_AMOUNT = 100000 * 1e6; // 100k USDC
    uint256 public constant MIN_DURATION_DAYS = 30;
    uint256 public constant MAX_DURATION_DAYS = 365;
    
    // 🎯 SIMPLIFIED PRECISION - Only one tolerance method
    uint256 public constant COMPLETION_TOLERANCE = 50000; // 0.05 USDC (very permissive)
    // Relative tolerance to avoid precision errors (0.1%)
    uint256 public constant COMPLETION_TOLERANCE_BPS = 10; // 10 basis points = 0.1%

    
    // Events
    event UserRegistered(address indexed user, string name, string profileIPFSHash, uint256 timestamp);
    event ProjectCreated(uint256 indexed projectId, address indexed farmer, string title, uint256 targetAmountUSDC, string imageIPFSHash, uint256 deadline);
    event ProjectInvestment(uint256 indexed projectId, address indexed investor, uint256 amount, uint256 newTotal);
    event ProjectCompleted(uint256 indexed projectId, uint256 totalRaised, uint256 investorCount);
    event FundsReleased(uint256 indexed projectId, address indexed farmer, uint256 amount, uint256 timestamp);
    event ProjectStatusUpdated(uint256 indexed projectId, ProjectStatus oldStatus, ProjectStatus newStatus);

    /**
     * @dev Set the investment manager address
     */
    function setInvestmentManager(address _investmentManager) external {
        require(address(investmentManager) == address(0), "Investment manager already set");
        require(_investmentManager != address(0), "Invalid address");
        investmentManager = IInvestmentManager(_investmentManager);
    }
    
    /**
     * @dev Register a new user
     */
    function registerUser(string memory name, string memory profileIPFSHash) external {
        require(!userProfiles[msg.sender].isRegistered, "User already registered");
        require(bytes(name).length > 0, "Name cannot be empty");
        
        userProfiles[msg.sender] = UserProfile({
            isRegistered: true,
            name: name,
            profileIPFSHash: profileIPFSHash,
            registeredAt: block.timestamp,
            projectCount: 0,
            totalInvested: 0,
            totalRaised: 0
        });
        
        _userCounter++;
        emit UserRegistered(msg.sender, name, profileIPFSHash, block.timestamp);
    }

    function _isWithinTolerance(uint256 current, uint256 target) internal pure returns (bool) {
        if (current >= target) return true;
        uint256 diff = target - current;
        uint256 tolerance = (target * COMPLETION_TOLERANCE_BPS) / 10000;
        return diff <= tolerance;
    }

    
    /**
     * @dev Create a new farming project
     */
    function createProject(
        string memory title,
        string memory description,
        string memory imageIPFSHash,
        string memory documentsIPFSHash,
        uint256 targetAmountUSDC,
        uint256 durationDays,
        string memory location,
        string memory category
    ) external nonReentrant {
        require(userProfiles[msg.sender].isRegistered, "User not registered");
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(bytes(imageIPFSHash).length > 0, "Image IPFS hash required");
        require(targetAmountUSDC >= MIN_FUNDING_AMOUNT && targetAmountUSDC <= MAX_FUNDING_AMOUNT, "Invalid funding amount");
        require(durationDays >= MIN_DURATION_DAYS && durationDays <= MAX_DURATION_DAYS, "Invalid duration");
        
        _projectIdCounter++;
        uint256 projectId = _projectIdCounter;
        uint256 deadline = block.timestamp + (durationDays * 1 days);
        
        projects[projectId] = Project({
            id: projectId,
            farmer: msg.sender,
            title: title,
            description: description,
            imageIPFSHash: imageIPFSHash,
            documentsIPFSHash: documentsIPFSHash,
            targetAmountUSDC: targetAmountUSDC,
            currentAmountUSDC: 0,
            durationDays: durationDays,
            createdAt: block.timestamp,
            deadline: deadline,
            status: ProjectStatus.Active,
            location: location,
            category: category,
            investorCount: 0,
            fundsReleased: false,
            fundsReleasedAt: 0
        });
        
        userProjects[msg.sender].push(projectId);
        userProfiles[msg.sender].projectCount++;
        
        emit ProjectCreated(projectId, msg.sender, title, targetAmountUSDC, imageIPFSHash, deadline);
    }
    
    /**
     * @dev Record investment (called by InvestmentManager)
     */
    function recordInvestment(uint256 projectId, address investor, uint256 amount) external {
        require(msg.sender == address(investmentManager), "Only InvestmentManager can call this");
        require(projects[projectId].id != 0, "Project does not exist");
        require(projects[projectId].status == ProjectStatus.Active, "Project not active");
        require(block.timestamp <= projects[projectId].deadline, "Funding period ended");
        
        // Create investment record
        projectInvestments[projectId].push(Investment({
            investor: investor,
            amount: amount,
            timestamp: block.timestamp,
            claimed: false
        }));
        
        // Update project funding
        projects[projectId].currentAmountUSDC += amount;
        
        // Check if new investor
        _updateInvestorRecord(projectId, investor, amount);
        
        emit ProjectInvestment(projectId, investor, amount, projects[projectId].currentAmountUSDC);
        
        // 🎯 SIMPLIFIED COMPLETION CHECK
        _checkProjectCompletion(projectId);
    }
    
    /**
     * @dev Internal function to update investor records
     */
    function _updateInvestorRecord(uint256 projectId, address investor, uint256 amount) internal {
        bool isNewInvestor = true;
        uint256[] memory investments = userInvestments[investor];
        
        for (uint256 i = 0; i < investments.length; i++) {
            if (investments[i] == projectId) {
                isNewInvestor = false;
                break;
            }
        }
        
        if (isNewInvestor) {
            userInvestments[investor].push(projectId);
            projects[projectId].investorCount++;
        }
        
        userProfiles[investor].totalInvested += amount;
    }
    
    /**
     * @dev 🎯 SIMPLIFIED PROJECT COMPLETION CHECK - Single tolerance method only
     */
    function _checkProjectCompletion(uint256 projectId) internal {
        uint256 current = projects[projectId].currentAmountUSDC;
        uint256 target = projects[projectId].targetAmountUSDC;
        
        bool isComplete = _isWithinTolerance(current, target);
        if (isComplete && projects[projectId].status == ProjectStatus.Active) {
            ProjectStatus oldStatus = projects[projectId].status;
            projects[projectId].status = ProjectStatus.Completed;
            userProfiles[projects[projectId].farmer].totalRaised += current;
            
            emit ProjectCompleted(projectId, current, projects[projectId].investorCount);
            emit ProjectStatusUpdated(projectId, oldStatus, ProjectStatus.Completed);
        }
    }
    
    /**
     * @dev 🎯 SIMPLIFIED CLAIM ELIGIBILITY CHECK - Single method only
     */
    function canClaimFunds(uint256 projectId) external view returns (bool) {
        Project memory project = projects[projectId];
        
        // Basic validation
        if (project.id == 0) return false;
        if (project.fundsReleased) return false;
        if (project.currentAmountUSDC == 0) return false;
        
        // Simple completion check
        uint256 current = project.currentAmountUSDC;
        uint256 target = project.targetAmountUSDC;
        
        bool isEligible = _isWithinTolerance(current, target);

        return isEligible && (project.status == ProjectStatus.Completed || project.status == ProjectStatus.Active);
    }

    /**
     * @dev 🎯 SIMPLIFIED claimProjectFunds - Minimal logic to avoid computation issues
     */
    function claimProjectFunds(uint256 projectId) external nonReentrant {
        Project storage project = projects[projectId];
        
        require(project.id != 0, "Project does not exist");
        require(project.farmer == msg.sender, "Only project farmer can claim funds");
        require(!project.fundsReleased, "Funds already released");
        require(project.currentAmountUSDC > 0, "No funds to release");
        
        // 🎯 SIMPLIFIED eligibility check - avoid external call that might fail
        uint256 current = project.currentAmountUSDC;
        uint256 target = project.targetAmountUSDC;
        require(_isWithinTolerance(current, target), "Project not eligible for fund claiming");
        
        // Mark funds as released BEFORE external call
        project.fundsReleased = true;
        project.fundsReleasedAt = block.timestamp;
        
        // Update status
        ProjectStatus oldStatus = project.status;
        project.status = ProjectStatus.FundsReleased;
        
        // 🎯 SIMPLIFIED external call - minimal error handling
        require(address(investmentManager) != address(0), "Investment manager not set");
        
        // Use low-level call with simple error handling
        try investmentManager.releaseFundsToFarmer(projectId, msg.sender, current) {
            emit FundsReleased(projectId, msg.sender, current, block.timestamp);
            emit ProjectStatusUpdated(projectId, oldStatus, ProjectStatus.FundsReleased);
        } catch {
            // Revert state changes if external call fails
            project.fundsReleased = false;
            project.fundsReleasedAt = 0;
            project.status = oldStatus;
            revert("Fund transfer failed");
        }
    }
    
    // 🎯 SIMPLIFIED VIEW FUNCTIONS - Remove complex calculations
    
    function getProject(uint256 projectId) external view returns (Project memory) {
        return projects[projectId];
    }
    
    function getAllProjects() external view returns (Project[] memory) {
        Project[] memory allProjects = new Project[](_projectIdCounter);
        for (uint256 i = 1; i <= _projectIdCounter; i++) {
            allProjects[i - 1] = projects[i];
        }
        return allProjects;
    }
    
    function getActiveProjects() external view returns (Project[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 1; i <= _projectIdCounter; i++) {
            if (projects[i].status == ProjectStatus.Active && block.timestamp <= projects[i].deadline) {
                activeCount++;
            }
        }
        
        Project[] memory activeProjects = new Project[](activeCount);
        uint256 currentIndex = 0;
        for (uint256 i = 1; i <= _projectIdCounter; i++) {
            if (projects[i].status == ProjectStatus.Active && block.timestamp <= projects[i].deadline) {
                activeProjects[currentIndex] = projects[i];
                currentIndex++;
            }
        }
        return activeProjects;
    }
    
    function getCompletedProjects() external view returns (Project[] memory) {
        uint256 completedCount = 0;
        for (uint256 i = 1; i <= _projectIdCounter; i++) {
            if (projects[i].status == ProjectStatus.Completed || projects[i].status == ProjectStatus.FundsReleased) {
                completedCount++;
            }
        }
        
        Project[] memory completedProjects = new Project[](completedCount);
        uint256 currentIndex = 0;
        for (uint256 i = 1; i <= _projectIdCounter; i++) {
            if (projects[i].status == ProjectStatus.Completed || projects[i].status == ProjectStatus.FundsReleased) {
                completedProjects[currentIndex] = projects[i];
                currentIndex++;
            }
        }
        return completedProjects;
    }
    
    function getProjectsByFarmer(address farmer) external view returns (uint256[] memory) {
        return userProjects[farmer];
    }
    
    function getInvestmentsByUser(address investor) external view returns (uint256[] memory) {
        return userInvestments[investor];
    }
    
    function getProjectInvestments(uint256 projectId) external view returns (Investment[] memory) {
        return projectInvestments[projectId];
    }
    
    function isUserRegistered(address user) external view returns (bool) {
        return userProfiles[user].isRegistered;
    }
    
    function getUserProfile(address user) external view returns (UserProfile memory) {
        return userProfiles[user];
    }
    
    function getFundingProgress(uint256 projectId) external view returns (uint256) {
        Project memory project = projects[projectId];
        if (project.targetAmountUSDC == 0) return 0;
        return (project.currentAmountUSDC * 100) / project.targetAmountUSDC;
    }
    
    function getPlatformStats() external view returns (
        uint256 totalProjects,
        uint256 totalUsers,
        uint256 totalInvestments,
        uint256 totalFunding
    ) {
        totalProjects = _projectIdCounter;
        totalUsers = _userCounter;
        for (uint256 i = 1; i <= _projectIdCounter; i++) {
            totalInvestments += projectInvestments[i].length;
            totalFunding += projects[i].currentAmountUSDC;
        }
    }
    
    function getTotalProjects() external view returns (uint256) {
        return _projectIdCounter;
    }
}