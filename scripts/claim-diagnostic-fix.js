// scripts/fixed-claim-diagnostic.js - FIXED VERSION WITH CORRECT ADDRESSES
const { ethers } = require("hardhat");

async function fixedClaimDiagnostic() {
  console.log("🔧 FIXED CLAIM DIAGNOSTIC - USING CORRECT ADDRESSES");
  console.log("=" .repeat(60));
  
  // ✅ CORRECT ADDRESSES from your latest deployment (amoy-precision-safe-final.json)
  const PROJECT_FACTORY = "0x12C784201524c9F4971875A07fcbf402134A285f";
  const INVESTMENT_MANAGER = "0x74bc118427502E1a67B4bddD602E9E5341E0E1BD";
  const USDC_ADDRESS = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";
  const FARMER_ADDRESS = "0xBF27545DA45F8c39907abf1617152F0C457ed8cc";
  
  console.log("📋 USING CORRECT CONTRACT ADDRESSES:");
  console.log("   ProjectFactory:    ", PROJECT_FACTORY);
  console.log("   InvestmentManager: ", INVESTMENT_MANAGER);
  console.log("   USDC Address:      ", USDC_ADDRESS);
  console.log("   Farmer Address:    ", FARMER_ADDRESS);
  console.log();

  try {
    // Get the farmer signer
    const [deployer] = await ethers.getSigners();
    console.log("Current signer:", await deployer.getAddress());
    
    // Check if we have the right account
    const currentAddress = await deployer.getAddress();
    if (currentAddress.toLowerCase() !== FARMER_ADDRESS.toLowerCase()) {
      console.log("❌ Wrong account connected!");
      console.log("   Expected farmer:", FARMER_ADDRESS);
      console.log("   Current account:", currentAddress);
      console.log("\n🔧 You need to:");
      console.log("   1. Switch to farmer account in MetaMask");
      console.log("   2. Make sure the farmer account has MATIC for gas");
      console.log("   3. Try the claim again");
      return;
    }
    
    console.log("✅ Correct farmer account connected!");
    
    // ✅ FIXED: Get contracts with correct addresses and error handling
    let projectFactory, usdc;
    
    try {
      console.log("\n🔍 Loading ProjectFactory contract...");
      projectFactory = await ethers.getContractAt("ProjectFactory", PROJECT_FACTORY);
      console.log("✅ ProjectFactory loaded successfully");
      
      console.log("🔍 Loading USDC contract...");
      usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
      console.log("✅ USDC contract loaded successfully");
    } catch (contractError) {
      console.error("❌ Error loading contracts:", contractError.message);
      console.log("\n🔧 Possible issues:");
      console.log("   1. Wrong contract addresses");
      console.log("   2. Contracts not deployed on this network");
      console.log("   3. Network connection issues");
      return;
    }
    
    console.log("\n📋 PRE-CLAIM VERIFICATION:");
    console.log("-".repeat(40));
    
    // Check farmer balances
    const farmerMATIC = await ethers.provider.getBalance(FARMER_ADDRESS);
    const farmerUSDC = await usdc.balanceOf(FARMER_ADDRESS);
    
    console.log("   Farmer MATIC:", ethers.formatEther(farmerMATIC) + " MATIC");
    console.log("   Farmer USDC before:", ethers.formatUnits(farmerUSDC, 6) + " USDC");
    
    if (farmerMATIC < ethers.parseEther("0.005")) {
      console.log("   ⚠️ Low MATIC balance! Need more for gas fees");
    }
    
    // Check project status
    let project;
    try {
      console.log("\n🔍 Loading project data...");
      project = await projectFactory.getProject(1);
      
      if (!project || project.id.toString() === "0") {
        console.log("❌ No project found with ID 1");
        console.log("   The project may not exist or was deployed on a different contract");
        return;
      }
      
      console.log("✅ Project loaded successfully");
      console.log("   Project title:", project.title);
      console.log("   Current amount:", ethers.formatUnits(project.currentAmountUSDC, 6) + " USDC");
      console.log("   Target amount:", ethers.formatUnits(project.targetAmountUSDC, 6) + " USDC");
      console.log("   Status:", getProjectStatus(project.status));
      console.log("   Funds released:", project.fundsReleased ? "Yes" : "No");
      
    } catch (projectError) {
      console.error("❌ Error loading project:", projectError.message);
      console.log("   The project may not exist on this deployment");
      return;
    }
    
    // ✅ FIXED: Check if claimProjectFunds function exists
    console.log("\n🔍 CHECKING CONTRACT FUNCTION AVAILABILITY:");
    console.log("-".repeat(40));
    
    try {
      // Test if the function exists by checking the contract interface
      const projectFactoryInterface = projectFactory.interface;
      const hasClaimFunction = projectFactoryInterface.hasFunction("claimProjectFunds");
      
      console.log("   claimProjectFunds function:", hasClaimFunction ? "✅ EXISTS" : "❌ MISSING");
      
      if (!hasClaimFunction) {
        console.log("❌ CRITICAL: claimProjectFunds function not found!");
        console.log("   This means:");
        console.log("   1. You're using the wrong contract address");
        console.log("   2. The contract doesn't have the claimProjectFunds function");
        console.log("   3. The ABI is outdated");
        
        console.log("\n🔍 Available functions on this contract:");
        const functions = Object.keys(projectFactoryInterface.functions);
        functions.slice(0, 10).forEach(func => {
          console.log(`     ${func}`);
        });
        if (functions.length > 10) {
          console.log(`     ... and ${functions.length - 10} more functions`);
        }
        
        return;
      }
      
    } catch (interfaceError) {
      console.error("❌ Error checking contract interface:", interfaceError.message);
      return;
    }
    
    // Check canClaimFunds
    try {
      const canClaim = await projectFactory.canClaimFunds(1);
      console.log("   Smart contract canClaim:", canClaim ? "✅ YES" : "❌ NO");
      
      if (!canClaim) {
        console.log("❌ Smart contract prevents claiming!");
        console.log("   Reasons could be:");
        console.log("   - Project not fully funded");
        console.log("   - Funds already released");
        console.log("   - Project not in completed status");
        
        // Check precision status if function exists
        try {
          const precisionStatus = await projectFactory.getProjectPrecisionStatus(1);
          console.log("\n📊 PRECISION STATUS:");
          console.log("   Current amount:", ethers.formatUnits(precisionStatus.currentAmount, 6) + " USDC");
          console.log("   Target amount:", ethers.formatUnits(precisionStatus.targetAmount, 6) + " USDC");
          console.log("   Difference:", ethers.formatUnits(precisionStatus.difference, 6) + " USDC");
          console.log("   Exact completion:", precisionStatus.exactCompletion);
          console.log("   Absolute tolerance:", precisionStatus.absoluteTolerance);
          console.log("   Percentage tolerance:", precisionStatus.percentageTolerance);
          console.log("   Can claim (precision):", precisionStatus.canClaim);
        } catch (precisionError) {
          console.log("   (Precision status not available)");
        }
        
        return;
      }
      
    } catch (canClaimError) {
      console.error("❌ Error checking canClaimFunds:", canClaimError.message);
      return;
    }
    
    if (project.fundsReleased) {
      console.log("✅ Funds already claimed!");
      console.log("   Check your USDC balance - you should have received the funds.");
      return;
    }
    
    console.log("\n🔧 ATTEMPTING CLAIM:");
    console.log("-".repeat(40));
    
    // Try the actual claim with proper error handling
    try {
      console.log("   Step 1: Estimating gas...");
      
      const gasEstimate = await projectFactory.estimateGas.claimProjectFunds(1);
      console.log("   ✅ Gas estimate:", gasEstimate.toString());
      
      console.log("   Step 2: Performing static call test...");
      await projectFactory.callStatic.claimProjectFunds(1);
      console.log("   ✅ Static call succeeded - transaction should work");
      
      console.log("   Step 3: Sending actual transaction...");
      
      const claimTx = await projectFactory.claimProjectFunds(1, {
        gasLimit: gasEstimate.mul(120).div(100), // 20% buffer
        gasPrice: ethers.parseUnits("30", "gwei") // 30 gwei
      });
      
      console.log("   📋 Transaction sent:", claimTx.hash);
      console.log("   ⏳ Waiting for confirmation...");
      
      const receipt = await claimTx.wait();
      console.log("   ✅ SUCCESS! Gas used:", receipt.gasUsed.toString());
      
      // Verify the claim worked
      const updatedProject = await projectFactory.getProject(1);
      const newFarmerUSDC = await usdc.balanceOf(FARMER_ADDRESS);
      const claimedAmount = newFarmerUSDC.sub(farmerUSDC);
      
      console.log("\n🎉 CLAIM VERIFICATION:");
      console.log("   Funds released:", updatedProject.fundsReleased ? "✅ YES" : "❌ NO");
      console.log("   USDC claimed:", ethers.formatUnits(claimedAmount, 6) + " USDC");
      console.log("   New farmer balance:", ethers.formatUnits(newFarmerUSDC, 6) + " USDC");
      
      console.log("\n✅ CLAIM SUCCESSFUL!");
      console.log("   Your frontend should work now with the same settings.");
      
    } catch (claimError) {
      console.error("❌ Claim failed:", claimError.message);
      console.log("\n🔧 Error details:");
      console.log("   Error code:", claimError.code || "unknown");
      console.log("   Error reason:", claimError.reason || "unknown");
      
      if (claimError.message.includes("insufficient funds")) {
        console.log("\n💡 SOLUTION: Add more MATIC to farmer account");
      } else if (claimError.message.includes("nonce")) {
        console.log("\n💡 SOLUTION: Reset MetaMask account nonce");
      } else if (claimError.message.includes("gas")) {
        console.log("\n💡 SOLUTION: Try increasing gas price or limit");
      } else {
        console.log("\n💡 SOLUTION: Check contract state and try again");
      }
    }
    
  } catch (error) {
    console.error("❌ Script failed:", error.message);
    
    console.log("\n🔧 DEBUGGING CHECKLIST:");
    console.log("1. ✅ Are you connected to Amoy network?");
    console.log("2. ✅ Are the contract addresses correct?");
    console.log("3. ✅ Does your account have MATIC for gas?");
    console.log("4. ✅ Is the project actually eligible for claiming?");
    console.log("5. ✅ Are you using the farmer account that created the project?");
  }
}

function getProjectStatus(statusCode) {
  const statuses = {
    0: "Active",
    1: "Completed", 
    2: "Cancelled",
    3: "Funds Released"
  };
  return statuses[statusCode] || `Unknown (${statusCode})`;
}

// Add comprehensive contract verification
async function verifyContracts() {
  console.log("\n🔍 COMPREHENSIVE CONTRACT VERIFICATION:");
  console.log("-".repeat(50));
  
  const PROJECT_FACTORY = "0x12C784201524c9F4971875A07fcbf402134A285f";
  const INVESTMENT_MANAGER = "0x74bc118427502E1a67B4bddD602E9E5341E0E1BD";
  
  try {
    const projectFactory = await ethers.getContractAt("ProjectFactory", PROJECT_FACTORY);
    
    // Check if contracts are properly linked
    const linkedManager = await projectFactory.investmentManager();
    console.log("   ProjectFactory → InvestmentManager:");
    console.log("   Expected:", INVESTMENT_MANAGER);
    console.log("   Actual:  ", linkedManager);
    console.log("   Status:  ", linkedManager.toLowerCase() === INVESTMENT_MANAGER.toLowerCase() ? "✅ LINKED" : "❌ NOT LINKED");
    
    // Check contract functions
    const totalProjects = await projectFactory.getTotalProjects();
    console.log("   Total projects:", totalProjects.toString());
    
    if (totalProjects > 0) {
      const project = await projectFactory.getProject(1);
      console.log("   Project 1 exists:", project.id.toString() !== "0" ? "✅ YES" : "❌ NO");
      
      if (project.id.toString() !== "0") {
        console.log("   Project title:", project.title);
        console.log("   Project farmer:", project.farmer);
      }
    }
    
  } catch (error) {
    console.log("   ❌ Contract verification failed:", error.message);
  }
}

fixedClaimDiagnostic()
  .then(() => verifyContracts())
  .catch(console.error);