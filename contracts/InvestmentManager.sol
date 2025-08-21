// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ProjectFactory.sol";

/**
 * @title Enhanced InvestmentManager - Complete with Fund Release
 * @dev Handles USDC investments with flexible minimum for final investments + Fund Release to Farmers
 * @notice Allows dynamic minimum investment when projects are near completion
 */
contract InvestmentManager is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    struct InvestorData {
        uint256 totalInvested;
        uint256 activeInvestments;
        uint256 claimedReturns;
        uint256[] projectIds;
    }
    
    struct YieldInfo {
        uint256 principalAmount;
        uint256 expectedReturn;
        uint256 returnDate;
        bool returned;
        bool claimed;
    }
    
    ProjectFactory public immutable projectFactory;
    IERC20 public immutable USDC;
    
    mapping(address => InvestorData) public investors;
    mapping(address => mapping(uint256 => uint256)) public investorProjectAmount;
    mapping(uint256 => YieldInfo) public projectYields;
    mapping(address => uint256) public pendingReturns;
    
    // NEW: Fund release tracking
    mapping(uint256 => bool) public fundsReleased;
    mapping(uint256 => uint256) public releasedAmount;
    mapping(uint256 => uint256) public releasedAt;
    
    uint256 public constant MIN_INVESTMENT = 10 * 1e6; // 10 USDC
    uint256 public constant MAX_INVESTMENT = 10000 * 1e6; // 10,000 USDC
    uint256 public constant ANNUAL_RETURN_RATE = 1200; // 12%
    uint256 public constant PLATFORM_FEE = 150; // 1.5%
    uint256 public constant FINAL_INVESTMENT_THRESHOLD = 20 * 1e6; // 20 USDC threshold
    
    event InvestmentMade(
        address indexed investor,
        uint256 indexed projectId,
        uint256 amountUSDC,
        uint256 platformFee,
        uint256 netInvestment,
        bool isFinalInvestment
    );
    
    event ReturnsDistributed(
        uint256 indexed projectId,
        uint256 totalReturns,
        uint256 investorCount
    );
    
    event ReturnsClaimed(
        address indexed investor,
        uint256 amount
    );
    
    event ProjectFunded(
        uint256 indexed projectId,
        uint256 totalAmount,
        uint256 investorCount
    );
    
    event ExcessRefunded(
        address indexed investor,
        uint256 indexed projectId,
        uint256 refundAmount
    );
    
    // NEW: Fund release events
    event FundsReleasedToFarmer(
        uint256 indexed projectId,
        address indexed farmer,
        uint256 amount,
        uint256 timestamp
    );
    
    constructor(address _projectFactory, address _usdc) {
        require(_projectFactory != address(0), "Invalid project factory");
        require(_usdc != address(0), "Invalid USDC address");
        
        projectFactory = ProjectFactory(_projectFactory);
        USDC = IERC20(_usdc);
    }
    
    /**
     * @dev Calculate the actual minimum investment required for a project
     * @param projectId The project to invest in
     * @return The minimum investment amount (can be less than MIN_INVESTMENT for final investments)
     */
    function getMinimumInvestment(uint256 projectId) public view returns (uint256) {
        ProjectFactory.Project memory project = projectFactory.getProject(projectId);
        
        if (project.id == 0) return MIN_INVESTMENT;
        
        uint256 remainingAmount = project.targetAmountUSDC - project.currentAmountUSDC;
        
        // If remaining amount is within threshold, allow flexible minimum
        if (remainingAmount <= FINAL_INVESTMENT_THRESHOLD && remainingAmount > 0) {
            return remainingAmount;
        }
        
        return MIN_INVESTMENT;
    }
    
    /**
     * @dev Check if this would be a final investment that completes the project
     * @param projectId The project to check
     * @param amountUSDC The investment amount (before fees)
     * @return Whether this investment would complete the project
     */
    function isFinalInvestment(uint256 projectId, uint256 amountUSDC) public view returns (bool) {
        ProjectFactory.Project memory project = projectFactory.getProject(projectId);
        
        if (project.id == 0) return false;
        
        uint256 platformFee = (amountUSDC * PLATFORM_FEE) / 10000;
        uint256 netInvestment = amountUSDC - platformFee;
        uint256 remainingAmount = project.targetAmountUSDC - project.currentAmountUSDC;
        
        return netInvestment >= remainingAmount;
    }
    
    /**
     * @dev Get comprehensive investment constraints for a project
     * @param projectId The project ID
     * @return minInvestment Minimum investment required
     * @return maxInvestment Maximum investment allowed
     * @return remainingAmount Amount needed to complete funding
     * @return canCompleteFunding Whether investor can complete the funding
     */
    function getInvestmentConstraints(uint256 projectId) external view returns (
        uint256 minInvestment,
        uint256 maxInvestment,
        uint256 remainingAmount,
        bool canCompleteFunding
    ) {
        ProjectFactory.Project memory project = projectFactory.getProject(projectId);
        
        if (project.id == 0 || project.status != ProjectFactory.ProjectStatus.Active) {
            return (MIN_INVESTMENT, MAX_INVESTMENT, 0, false);
        }
        
        remainingAmount = project.targetAmountUSDC - project.currentAmountUSDC;
        minInvestment = getMinimumInvestment(projectId);
        maxInvestment = MAX_INVESTMENT;
        
        // Adjust max investment to not exceed remaining amount (accounting for fees)
        // Formula: gross = net / (1 - fee_rate)
        uint256 maxPossibleGross = (remainingAmount * 10000) / (10000 - PLATFORM_FEE);
        if (maxPossibleGross < maxInvestment) {
            maxInvestment = maxPossibleGross;
        }
        
        canCompleteFunding = remainingAmount <= FINAL_INVESTMENT_THRESHOLD && remainingAmount > 0;
    }
    
    /**
     * @dev Enhanced investment function with flexible final investment handling
     */
    function investInProject(uint256 projectId, uint256 amountUSDC) external nonReentrant {
        require(projectFactory.isUserRegistered(msg.sender), "User not registered");
        
        // Get dynamic minimum investment
        uint256 minimumRequired = getMinimumInvestment(projectId);
        require(amountUSDC >= minimumRequired, "Investment below minimum required");
        require(amountUSDC <= MAX_INVESTMENT, "Investment above maximum");
        
        // Validate project and investment
        _validateInvestment(projectId, amountUSDC);
        
        // Check if this is a final investment
        bool isComplete = isFinalInvestment(projectId, amountUSDC);
        
        // Execute the investment
        _executeInvestment(projectId, amountUSDC, isComplete);
    }
    
    /**
     * @dev Validate investment constraints
     */
    function _validateInvestment(uint256 projectId, uint256 amountUSDC) internal view {
        ProjectFactory.Project memory project = projectFactory.getProject(projectId);
        require(project.id != 0, "Project does not exist");
        require(
            project.status == ProjectFactory.ProjectStatus.Active,
            "Project not active for investment"
        );
        require(block.timestamp <= project.deadline, "Investment period ended");
        
        uint256 platformFee = (amountUSDC * PLATFORM_FEE) / 10000;
        uint256 netInvestment = amountUSDC - platformFee;
        uint256 remainingAmount = project.targetAmountUSDC - project.currentAmountUSDC;
        
        require(netInvestment <= remainingAmount + 1, "Investment exceeds remaining target");
    }
    
    /**
     * @dev Execute investment with final investment handling and automatic refunds
     */
    function _executeInvestment(uint256 projectId, uint256 amountUSDC, bool isComplete) internal {
        uint256 originalAmount = amountUSDC;
        
        // Transfer initial USDC amount
        USDC.safeTransferFrom(msg.sender, address(this), amountUSDC);
        
        // Calculate fees
        uint256 platformFee = (amountUSDC * PLATFORM_FEE) / 10000;
        uint256 netInvestment = amountUSDC - platformFee;
        uint256 refundAmount = 0;
        
        // If this completes the project, adjust investment to exact remaining amount
        if (isComplete) {
            ProjectFactory.Project memory project = projectFactory.getProject(projectId);
            uint256 remainingAmount = project.targetAmountUSDC - project.currentAmountUSDC;
            
            if (netInvestment > remainingAmount) {
                // Calculate excess and refund
                uint256 excessNet = netInvestment - remainingAmount;
                
                // Calculate the gross amount that corresponds to this excess net
                // Using the formula: gross = net / (1 - fee_rate)
                uint256 excessGross = (excessNet * 10000) / (10000 - PLATFORM_FEE);
                
                // Adjust amounts
                refundAmount = excessGross;
                amountUSDC = originalAmount - refundAmount;
                platformFee = (amountUSDC * PLATFORM_FEE) / 10000;
                netInvestment = amountUSDC - platformFee;
                
                // Refund excess to investor
                USDC.safeTransfer(msg.sender, refundAmount);
                
                emit ExcessRefunded(msg.sender, projectId, refundAmount);
            }
        }
        
        // Record investment on ProjectFactory
        projectFactory.recordInvestment(projectId, msg.sender, netInvestment);
        
        // Update local records
        _updateInvestorData(projectId, netInvestment);
        _updateYieldInfo(projectId, netInvestment);
        
        emit InvestmentMade(
            msg.sender, 
            projectId, 
            amountUSDC, 
            platformFee, 
            netInvestment, 
            isComplete
        );
        
        // Check if project is now completed
        if (isComplete) {
            ProjectFactory.Project memory updatedProject = projectFactory.getProject(projectId);
            emit ProjectFunded(
                projectId,
                updatedProject.currentAmountUSDC,
                updatedProject.investorCount
            );
        }
    }
    
    /**
     * @dev Update investor data
     */
    function _updateInvestorData(uint256 projectId, uint256 netInvestment) internal {
        if (investorProjectAmount[msg.sender][projectId] == 0) {
            investors[msg.sender].projectIds.push(projectId);
            investors[msg.sender].activeInvestments++;
        }
        
        investorProjectAmount[msg.sender][projectId] += netInvestment;
        investors[msg.sender].totalInvested += netInvestment;
    }
    
    /**
     * @dev Update yield information
     */
    function _updateYieldInfo(uint256 projectId, uint256 netInvestment) internal {
        ProjectFactory.Project memory project = projectFactory.getProject(projectId);
        uint256 expectedReturn = calculateExpectedReturn(netInvestment, project.durationDays);
        
        if (projectYields[projectId].principalAmount == 0) {
            projectYields[projectId] = YieldInfo({
                principalAmount: netInvestment,
                expectedReturn: expectedReturn,
                returnDate: project.deadline + 30 days,
                returned: false,
                claimed: false
            });
        } else {
            projectYields[projectId].principalAmount += netInvestment;
            projectYields[projectId].expectedReturn += expectedReturn;
        }
    }
    
    /**
     * @dev NEW: Release funds to farmer when project is completed
     * This function is called by the ProjectFactory when farmer claims funds
     */
    function releaseFundsToFarmer(
        uint256 projectId,
        address farmer,
        uint256 amount
    ) external nonReentrant {
        require(msg.sender == address(projectFactory), "Only ProjectFactory can call this");
        require(!fundsReleased[projectId], "Funds already released");
        require(amount > 0, "Invalid amount");
        
        // Verify the project is completed and farmer is correct
        ProjectFactory.Project memory project = projectFactory.getProject(projectId);
        require(project.farmer == farmer, "Invalid farmer");
        require(project.status == ProjectFactory.ProjectStatus.Completed, "Project not completed");
        
        // Mark funds as released
        fundsReleased[projectId] = true;
        releasedAmount[projectId] = amount;
        releasedAt[projectId] = block.timestamp;
        
        // Transfer USDC to farmer
        USDC.safeTransfer(farmer, amount);
        
        emit FundsReleasedToFarmer(projectId, farmer, amount, block.timestamp);
    }
    
    /**
     * @dev Check if funds can be released for a project
     */
    function canReleaseFunds(uint256 projectId) external view returns (bool) {
        if (fundsReleased[projectId]) return false;
        
        ProjectFactory.Project memory project = projectFactory.getProject(projectId);
        return (
            project.id != 0 &&
            project.status == ProjectFactory.ProjectStatus.Completed &&
            project.currentAmountUSDC > 0
        );
    }
    
    /**
     * @dev Get fund release status for a project
     */
    function getFundReleaseStatus(uint256 projectId) external view returns (
        bool released,
        uint256 amount,
        uint256 releasedTimestamp
    ) {
        return (
            fundsReleased[projectId],
            releasedAmount[projectId],
            releasedAt[projectId]
        );
    }
    
    /**
     * @dev Farmer deposits returns for completed project
     */
    function depositReturns(uint256 projectId) external payable nonReentrant {
        ProjectFactory.Project memory project = projectFactory.getProject(projectId);
        require(project.farmer == msg.sender, "Only project farmer can deposit returns");
        require(
            project.status == ProjectFactory.ProjectStatus.Completed ||
            project.status == ProjectFactory.ProjectStatus.FundsReleased,
            "Project not completed"
        );
        require(!projectYields[projectId].returned, "Returns already deposited");
        
        YieldInfo storage yieldInfo = projectYields[projectId];
        uint256 expectedTotalReturn = yieldInfo.principalAmount + yieldInfo.expectedReturn;
        
        require(msg.value >= expectedTotalReturn, "Insufficient return amount");
        
        yieldInfo.returned = true;
        _distributeReturns(projectId, msg.value);
        
        emit ReturnsDistributed(projectId, msg.value, project.investorCount);
    }
    
    /**
     * @dev Internal function to distribute returns proportionally
     */
    function _distributeReturns(uint256 projectId, uint256 totalAmount) internal {
        ProjectFactory.Investment[] memory investments = projectFactory.getProjectInvestments(projectId);
        uint256 totalPrincipal = projectYields[projectId].principalAmount;
        
        for (uint256 i = 0; i < investments.length; i++) {
            address investor = investments[i].investor;
            uint256 investmentAmount = investments[i].amount;
            
            uint256 investorReturn = (totalAmount * investmentAmount) / totalPrincipal;
            pendingReturns[investor] += investorReturn;
        }
    }
    
    /**
     * @dev Claim pending returns
     */
    function claimReturns() external nonReentrant {
        uint256 amount = pendingReturns[msg.sender];
        require(amount > 0, "No returns to claim");
        
        pendingReturns[msg.sender] = 0;
        investors[msg.sender].claimedReturns += amount;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Return transfer failed");
        
        emit ReturnsClaimed(msg.sender, amount);
    }
    
    /**
     * @dev Calculate expected return based on principal and duration
     */
    function calculateExpectedReturn(
        uint256 principalAmount,
        uint256 durationDays
    ) public pure returns (uint256) {
        return (principalAmount * ANNUAL_RETURN_RATE * durationDays) / (365 * 10000);
    }
    
    /**
     * @dev Get investor data with all investment details
     */
    function getInvestorData(address investor) external view returns (
        uint256 totalInvested,
        uint256 activeInvestments,
        uint256 claimedReturns,
        uint256 pendingAmount,
        uint256[] memory projectIds
    ) {
        InvestorData memory data = investors[investor];
        return (
            data.totalInvested,
            data.activeInvestments,
            data.claimedReturns,
            pendingReturns[investor],
            data.projectIds
        );
    }
    
    /**
     * @dev Get investment amount for specific investor and project
     */
    function getInvestmentAmount(
        address investor,
        uint256 projectId
    ) external view returns (uint256) {
        return investorProjectAmount[investor][projectId];
    }
    
    /**
     * @dev Get yield information for a project
     */
    function getProjectYieldInfo(uint256 projectId) external view returns (
        uint256 principalAmount,
        uint256 expectedReturn,
        uint256 returnDate,
        bool returned,
        bool claimed
    ) {
        YieldInfo memory yieldInfo = projectYields[projectId];
        return (
            yieldInfo.principalAmount,
            yieldInfo.expectedReturn,
            yieldInfo.returnDate,
            yieldInfo.returned,
            yieldInfo.claimed
        );
    }
    
    /**
     * @dev Get pending returns for an investor
     */
    function getPendingReturns(address investor) external view returns (uint256) {
        return pendingReturns[investor];
    }
    
    /**
     * @dev Get contract balances
     */
    function getContractBalances() external view returns (
        uint256 usdcBalance,
        uint256 ethBalance
    ) {
        return (
            USDC.balanceOf(address(this)),
            address(this).balance
        );
    }
    
    /**
     * @dev Check if a project can accept final investments
     */
    function canAcceptFinalInvestment(uint256 projectId) external view returns (bool) {
        ProjectFactory.Project memory project = projectFactory.getProject(projectId);
        
        if (project.id == 0 || project.status != ProjectFactory.ProjectStatus.Active) {
            return false;
        }
        
        uint256 remainingAmount = project.targetAmountUSDC - project.currentAmountUSDC;
        return remainingAmount <= FINAL_INVESTMENT_THRESHOLD && remainingAmount > 0;
    }
    
    /**
     * @dev Get detailed funding status for a project
     */
    function getProjectFundingStatus(uint256 projectId) external view returns (
        uint256 targetAmount,
        uint256 currentAmount,
        uint256 remainingAmount,
        uint256 fundingPercentage,
        bool isNearCompletion,
        bool isCompleted
    ) {
        ProjectFactory.Project memory project = projectFactory.getProject(projectId);
        
        if (project.id == 0) {
            return (0, 0, 0, 0, false, false);
        }
        
        targetAmount = project.targetAmountUSDC;
        currentAmount = project.currentAmountUSDC;
        remainingAmount = targetAmount - currentAmount;
        
        if (targetAmount > 0) {
            fundingPercentage = (currentAmount * 100) / targetAmount;
        }
        
        isNearCompletion = remainingAmount <= FINAL_INVESTMENT_THRESHOLD && remainingAmount > 0;
        isCompleted = remainingAmount == 0;
        
        return (
            targetAmount,
            currentAmount,
            remainingAmount,
            fundingPercentage,
            isNearCompletion,
            isCompleted
        );
    }
    
    /**
     * @dev Receive function to accept ETH returns
     */
    receive() external payable {}
}