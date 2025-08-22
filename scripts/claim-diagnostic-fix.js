// scripts/debug-claim-fixed.js - Fixed debug script with better error handling
const { ethers } = require("hardhat");

async function debugClaimTransactionFixed() {
  console.log("🔍 FIXED DEBUGGING CLAIM TRANSACTION FAILURE");
  console.log("=" .repeat(60));
  
  // Your current contract addresses from the error logs
  const PROJECT_FACTORY = "0x12C784201524c9F4971875A07fcbf402134A285f";
  const INVESTMENT_MANAGER = "0x74bc118427502E1a67B4bddD602E9E5341E0E1BD";
  const USDC_ADDRESS = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";
  
  try {
    // Step 1: Basic connection test
    console.log("📋 STEP 1: Basic Connection Test");
    const [signer] = await ethers.getSigners();
    
    if (!signer) {
      throw new Error("No signer available - check your private key in .env");
    }
    
    const signerAddress = await signer.getAddress();
    console.log("   ✅ Signer connected:", signerAddress);
    
    const network = await ethers.provider.getNetwork();
    console.log("   ✅ Network:", network.name, "Chain ID:", network.chainId.toString());
    
    if (network.chainId.toString() !== "80002") {
      console.log("   ⚠️ WARNING: Not on Amoy network! Expected chain ID: 80002");
    }
    
    // Step 2: Contract loading with error handling
    console.log("\n📋 STEP 2: Contract Loading Test");
    
    let projectFactory, investmentManager, usdc;
    
    // Load ProjectFactory
    try {
      console.log("   Loading ProjectFactory...");
      projectFactory = await ethers.getContractAt("ProjectFactory", PROJECT_FACTORY);
      const pfAddress = await projectFactory.getAddress();
      console.log("   ✅ ProjectFactory loaded:", pfAddress);
    } catch (pfError) {
      console.log("   ❌ ProjectFactory loading failed:", pfError.message);
      console.log("   Possible causes:");
      console.log("   - Wrong contract address");
      console.log("   - Contract not deployed on this network");
      console.log("   - ABI mismatch");
      return;
    }
    
    // Load InvestmentManager
    try {
      console.log("   Loading InvestmentManager...");
      investmentManager = await ethers.getContractAt("InvestmentManager", INVESTMENT_MANAGER);
      const imAddress = await investmentManager.getAddress();
      console.log("   ✅ InvestmentManager loaded:", imAddress);
    } catch (imError) {
      console.log("   ❌ InvestmentManager loading failed:", imError.message);
      console.log("   This could be why claiming fails!");
      
      // Continue without InvestmentManager for now
      investmentManager = null;
    }
    
    // Load USDC
    try {
      console.log("   Loading USDC...");
      usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
      const usdcAddress = await usdc.getAddress();
      console.log("   ✅ USDC loaded:", usdcAddress);
    } catch (usdcError) {
      console.log("   ❌ USDC loading failed:", usdcError.message);
      usdc = null;
    }
    
    // Step 3: Project data analysis
    console.log("\n📋 STEP 3: Project Data Analysis");
    
    let project;
    try {
      project = await projectFactory.getProject(1);
      
      if (!project || project.id.toString() === "0") {
        console.log("   ❌ Project 1 does not exist!");
        console.log("   Check if you have any projects created");
        
        // Check total projects
        const totalProjects = await projectFactory.getTotalProjects();
        console.log("   Total projects in contract:", totalProjects.toString());
        
        if (totalProjects.toString() === "0") {
          console.log("   💡 SOLUTION: Create a project first!");
        }
        return;
      }
      
      console.log("   ✅ Project loaded successfully");
      console.log("   Project ID:", project.id.toString());
      console.log("   Title:", project.title);
      console.log("   Farmer:", project.farmer);
      console.log("   Current signer:", signerAddress);
      console.log("   Is farmer?", project.farmer.toLowerCase() === signerAddress.toLowerCase() ? "✅ YES" : "❌ NO");
      console.log("   Current amount:", ethers.formatUnits(project.currentAmountUSDC, 6), "USDC");
      console.log("   Target amount:", ethers.formatUnits(project.targetAmountUSDC, 6), "USDC");
      console.log("   Funds released:", project.fundsReleased ? "✅ YES" : "❌ NO");
      console.log("   Status:", project.status.toString());
      
      // Calculate funding percentage
      const currentAmount = parseFloat(ethers.formatUnits(project.currentAmountUSDC, 6));
      const targetAmount = parseFloat(ethers.formatUnits(project.targetAmountUSDC, 6));
      const fundingPercentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
      console.log("   Funding percentage:", fundingPercentage.toFixed(2) + "%");
      
    } catch (projectError) {
      console.log("   ❌ Error loading project:", projectError.message);
      return;
    }
    
    // Step 4: Account verification
    console.log("\n📋 STEP 4: Account Verification");
    
    if (project.farmer.toLowerCase() !== signerAddress.toLowerCase()) {
      console.log("   ❌ WRONG ACCOUNT!");
      console.log("   Expected farmer account:", project.farmer);
      console.log("   Current account:", signerAddress);
      console.log("   💡 SOLUTION: Switch MetaMask to the farmer account");
      return;
    } else {
      console.log("   ✅ Correct farmer account connected");
    }
    
    // Step 5: Fund release status
    console.log("\n📋 STEP 5: Fund Release Status");
    
    if (project.fundsReleased) {
      console.log("   ❌ Funds already released!");
      console.log("   Release date:", project.fundsReleasedAt.toString() !== "0" 
        ? new Date(parseInt(project.fundsReleasedAt) * 1000).toLocaleDateString()
        : "Unknown");
      console.log("   💡 You've already claimed the funds for this project");
      return;
    } else {
      console.log("   ✅ Funds not yet released - eligible for claiming");
    }
    
    // Step 6: Eligibility check
    console.log("\n📋 STEP 6: Claim Eligibility Check");
    
    try {
      const canClaim = await projectFactory.canClaimFunds(1);
      console.log("   Smart contract canClaim:", canClaim ? "✅ YES" : "❌ NO");
      
      if (!canClaim) {
        console.log("   ❌ Smart contract prevents claiming!");
        console.log("   Reasons could be:");
        console.log("   - Project not fully funded");
        console.log("   - Funds already released");
        console.log("   - Project status not eligible");
        
        // Check precision status if available
        try {
          const precision = await projectFactory.getProjectPrecisionStatus(1);
          console.log("   📊 Precision Analysis:");
          console.log("     Current:", ethers.formatUnits(precision.currentAmount, 6), "USDC");
          console.log("     Target:", ethers.formatUnits(precision.targetAmount, 6), "USDC");
          console.log("     Difference:", ethers.formatUnits(precision.difference, 6), "USDC");
          console.log("     Exact completion:", precision.exactCompletion);
          console.log("     Absolute tolerance:", precision.absoluteTolerance);
          console.log("     Percentage tolerance:", precision.percentageTolerance);
          
          if (!precision.exactCompletion && !precision.absoluteTolerance && !precision.percentageTolerance) {
            console.log("   💡 PROJECT NOT FULLY FUNDED - Need more investments!");
          }
          
        } catch (precisionError) {
          console.log("   (Precision status function not available)");
        }
        return;
      } else {
        console.log("   ✅ Project eligible for fund claiming");
      }
      
    } catch (eligibilityError) {
      console.log("   ❌ Error checking eligibility:", eligibilityError.message);
    }
    
    // Step 7: Contract linking check
    console.log("\n📋 STEP 7: Contract Linking Check");
    
    try {
      const linkedManager = await projectFactory.investmentManager();
      console.log("   ProjectFactory.investmentManager:", linkedManager);
      console.log("   Expected InvestmentManager:", INVESTMENT_MANAGER);
      
      const isLinked = linkedManager.toLowerCase() === INVESTMENT_MANAGER.toLowerCase();
      console.log("   Contracts linked:", isLinked ? "✅ YES" : "❌ NO");
      
      if (!isLinked) {
        console.log("   ❌ CRITICAL: Contracts not properly linked!");
        console.log("   This is why claimProjectFunds fails!");
        console.log("   💡 SOLUTION: Redeploy contracts or fix linking");
        return;
      }
      
    } catch (linkingError) {
      console.log("   ❌ Error checking contract linking:", linkingError.message);
    }
    
    // Step 8: Balance checks
    console.log("\n📋 STEP 8: Balance Analysis");
    
    try {
      const signerMATIC = await ethers.provider.getBalance(signerAddress);
      console.log("   Signer MATIC:", ethers.formatEther(signerMATIC), "MATIC");
      
      if (signerMATIC < ethers.parseEther("0.01")) {
        console.log("   ⚠️ WARNING: Low MATIC balance - may not have enough for gas");
      }
      
      if (usdc) {
        const signerUSDC = await usdc.balanceOf(signerAddress);
        console.log("   Signer USDC:", ethers.formatUnits(signerUSDC, 6), "USDC");
        
        if (investmentManager) {
          const contractUSDC = await usdc.balanceOf(INVESTMENT_MANAGER);
          console.log("   InvestmentManager USDC:", ethers.formatUnits(contractUSDC, 6), "USDC");
          
          const neededUSDC = project.currentAmountUSDC;
          if (contractUSDC < neededUSDC) {
            console.log("   ❌ CRITICAL: InvestmentManager insufficient USDC!");
            console.log("   Contract has:", ethers.formatUnits(contractUSDC, 6), "USDC");
            console.log("   Needs:", ethers.formatUnits(neededUSDC, 6), "USDC");
            console.log("   Shortfall:", ethers.formatUnits(neededUSDC.sub(contractUSDC), 6), "USDC");
            console.log("   💡 SOLUTION: Investigate why InvestmentManager is missing funds");
            return;
          } else {
            console.log("   ✅ InvestmentManager has sufficient USDC");
          }
        }
      }
      
    } catch (balanceError) {
      console.log("   ❌ Error checking balances:", balanceError.message);
    }
    
    // Step 9: Gas estimation
    console.log("\n📋 STEP 9: Transaction Simulation");
    
    try {
      console.log("   Testing gas estimation...");
      const gasEstimate = await projectFactory.estimateGas.claimProjectFunds(1);
      console.log("   ✅ Gas estimate successful:", gasEstimate.toString());
      
      console.log("   Testing static call...");
      await projectFactory.callStatic.claimProjectFunds(1);
      console.log("   ✅ Static call successful - transaction should work!");
      
    } catch (gasError) {
      console.log("   ❌ Gas estimation/static call failed:", gasError.message);
      console.log("   This is the exact reason your transaction fails!");
      
      // Analyze the specific error
      if (gasError.message.includes("Fund transfer failed")) {
        console.log("   🔍 ERROR TYPE: Fund transfer failed");
        console.log("   This happens in InvestmentManager.releaseFundsToFarmer");
        console.log("   Possible causes:");
        console.log("   1. InvestmentManager doesn't have enough USDC");
        console.log("   2. USDC transfer reverted");
        console.log("   3. Access control failure");
      } else if (gasError.message.includes("Investment manager not set")) {
        console.log("   🔍 ERROR TYPE: Investment manager not set");
        console.log("   ProjectFactory.investmentManager is zero address");
      } else if (gasError.message.includes("Only project farmer")) {
        console.log("   🔍 ERROR TYPE: Wrong account");
        console.log("   You're not the project farmer");
      } else if (gasError.message.includes("Project not eligible")) {
        console.log("   🔍 ERROR TYPE: Not eligible for claiming");
        console.log("   canClaimFunds returned false");
      } else {
        console.log("   🔍 ERROR TYPE: Unknown");
        console.log("   Check the full error message above");
      }
      
      return;
    }
    
    // If we get here, everything should work!
    console.log("\n🎉 ALL CHECKS PASSED!");
    console.log("✅ Your transaction should work perfectly");
    console.log("✅ Try the claim again from your frontend");
    
    console.log("\n💡 If frontend still fails, try these MetaMask fixes:");
    console.log("1. Increase gas price to 40 GWEI");
    console.log("2. Set gas limit to 300,000");
    console.log("3. Clear MetaMask activity tab");
    console.log("4. Try again in a few minutes");
    
  } catch (error) {
    console.error("❌ Debug script failed:", error.message);
    console.log("\n🔧 Basic troubleshooting:");
    console.log("1. Check your .env file has the correct PRIVATE_KEY");
    console.log("2. Make sure you're connected to Amoy network");
    console.log("3. Verify contract addresses are correct");
    console.log("4. Try: npx hardhat compile");
  }
}

debugClaimTransactionFixed().catch(console.error);