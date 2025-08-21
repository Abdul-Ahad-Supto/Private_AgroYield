// scripts/direct-claim-fix.js - SIMULATE EXACT FRONTEND CLAIM PROCESS
const { ethers } = require("hardhat");

async function directClaimFix() {
  console.log("🔧 DIRECT FRONTEND-STYLE CLAIM FIX");
  console.log("=" .repeat(60));
  
  // This simulates exactly what your frontend should be doing
  const PROJECT_FACTORY = "0x7C9E5Cf352e1994dbe3066C4Aa1DFaDc32E33e34";
  const USDC_ADDRESS = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";
  const FARMER_ADDRESS = "0xBF27545DA45F8c39907abf1617152F0C457ed8cc";
  
  try {
    // Get the farmer signer (this is what your frontend wallet connection does)
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
    
    // Get contracts (same as frontend)
    const projectFactory = await ethers.getContractAt("ProjectFactory", PROJECT_FACTORY);
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    
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
    
    // Check project status (same checks as frontend)
    const project = await projectFactory.getProject(1);
    console.log("   Project title:", project.title);
    console.log("   Current amount:", ethers.formatUnits(project.currentAmountUSDC, 6) + " USDC");
    console.log("   Target amount:", ethers.formatUnits(project.targetAmountUSDC, 6) + " USDC");
    console.log("   Status:", getProjectStatus(project.status));
    console.log("   Funds released:", project.fundsReleased ? "Yes" : "No");
    
    // Critical check - same as frontend does
    const canClaim = await projectFactory.canClaimFunds(1);
    console.log("   Smart contract canClaim:", canClaim ? "✅ YES" : "❌ NO");
    
    if (!canClaim) {
      console.log("❌ Smart contract prevents claiming!");
      console.log("   The frontend should not show the claim button.");
      return;
    }
    
    if (project.fundsReleased) {
      console.log("✅ Funds already claimed!");
      console.log("   Check your USDC balance - you should have received the funds.");
      return;
    }
    
    console.log("\n🔧 FRONTEND CLAIM SIMULATION:");
    console.log("-".repeat(40));
    
    // This is exactly what happens when you click "Claim Funds" in frontend
    console.log("   Step 1: Estimating gas...");
    
    let gasEstimate;
    try {
      gasEstimate = await projectFactory.estimateGas.claimProjectFunds(1);
      console.log("   ✅ Gas estimate:", gasEstimate.toString());
    } catch (gasError) {
      console.log("   ❌ Gas estimation failed:", gasError.message);
      
      // Try with static call to see what would happen
      try {
        await projectFactory.callStatic.claimProjectFunds(1);
        console.log("   ✅ Static call succeeded - transaction should work");
      } catch (staticError) {
        console.log("   ❌ Static call failed:", staticError.reason || staticError.message);
        console.log("   This is why your frontend claim is failing!");
        
        // Specific error handling
        if (staticError.message.includes("not eligible")) {
          console.log("\n🔧 AUTO-FIX: Making project eligible...");
          await makeProjectFullyFunded();
          return;
        }
        
        return;
      }
    }
    
    console.log("   Step 2: Sending transaction...");
    
    // Try multiple gas strategies (same as good frontend would do)
    const gasStrategies = [
      { gasLimit: gasEstimate.mul(110).div(100), gasPrice: null }, // 10% buffer, market price
      { gasLimit: gasEstimate.mul(130).div(100), gasPrice: ethers.parseUnits("30", "gwei") }, // 30% buffer, 30 gwei
      { gasLimit: gasEstimate.mul(150).div(100), gasPrice: ethers.parseUnits("50", "gwei") }, // 50% buffer, 50 gwei
      { gasLimit: 500000, gasPrice: ethers.parseUnits("80", "gwei") } // High fixed values
    ];
    
    for (let i = 0; i < gasStrategies.length; i++) {
      const strategy = gasStrategies[i];
      console.log(`   Attempt ${i + 1}: gasLimit=${strategy.gasLimit}, gasPrice=${strategy.gasPrice ? ethers.formatUnits(strategy.gasPrice, "gwei") + " gwei" : "market"}`);
      
      try {
        const txParams = { gasLimit: strategy.gasLimit };
        if (strategy.gasPrice) {
          txParams.gasPrice = strategy.gasPrice;
        }
        
        const claimTx = await projectFactory.claimProjectFunds(1, txParams);
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
        
        console.log("\n✅ FRONTEND CLAIM WOULD WORK WITH THESE SETTINGS!");
        console.log("   Problem solved - use higher gas settings in your frontend.");
        return;
        
      } catch (attemptError) {
        console.log(`   ❌ Attempt ${i + 1} failed:`, attemptError.message);
        
        if (i === gasStrategies.length - 1) {
          console.log("\n❌ ALL GAS STRATEGIES FAILED!");
          console.log("   This indicates a deeper smart contract issue.");
          
          // Final diagnosis
          await finalDiagnosis(projectFactory);
        }
      }
    }
    
  } catch (error) {
    console.error("❌ Direct claim fix failed:", error.message);
    
    console.log("\n🔧 DEBUGGING INFO:");
    console.log("   Error type:", error.code || "unknown");
    console.log("   Error reason:", error.reason || "unknown");
    console.log("   Error message:", error.message);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 SOLUTION: Add more MATIC to farmer account");
      console.log("   Farmer needs MATIC for gas fees");
    }
    
    if (error.message.includes("nonce")) {
      console.log("\n💡 SOLUTION: Reset MetaMask account");
      console.log("   Settings > Advanced > Reset Account");
    }
  }
}

async function makeProjectFullyFunded() {
  console.log("\n🔧 AUTO-FIX: Completing project funding...");
  
  const INVESTMENT_MANAGER = "0xEdA444Bddd7Af7fD5a66bff9e614D6BCdc139ad2";
  const USDC_ADDRESS = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";
  
  try {
    const [signer] = await ethers.getSigners();
    const investmentManager = await ethers.getContractAt("InvestmentManager", INVESTMENT_MANAGER);
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    
    // Invest the missing 0.00225 USDC + buffer
    const investAmount = ethers.parseUnits("0.01", 6); // 0.01 USDC should be enough
    
    console.log("   Approving 0.01 USDC...");
    const approveTx = await usdc.approve(INVESTMENT_MANAGER, investAmount);
    await approveTx.wait();
    
    console.log("   Investing to complete project...");
    const investTx = await investmentManager.investInProject(1, investAmount);
    await investTx.wait();
    
    console.log("   ✅ Project completed! Now try claiming again.");
    
  } catch (error) {
    console.log("   ❌ Auto-fix failed:", error.message);
  }
}

async function finalDiagnosis(projectFactory) {
  console.log("\n🔍 FINAL DIAGNOSIS:");
  console.log("-".repeat(30));
  
  try {
    // Check if there's a linking issue
    const linkedManager = await projectFactory.investmentManager();
    console.log("   Linked InvestmentManager:", linkedManager);
    console.log("   Expected:", "0xEdA444Bddd7Af7fD5a66bff9e614D6BCdc139ad2");
    
    const isLinked = linkedManager.toLowerCase() === "0xEdA444Bddd7Af7fD5a66bff9e614D6BCdc139ad2".toLowerCase();
    console.log("   Contracts linked:", isLinked ? "✅ YES" : "❌ NO");
    
    if (!isLinked) {
      console.log("   🔧 CONTRACT LINKING ISSUE FOUND!");
      console.log("   This is why the claim is failing.");
    }
    
  } catch (error) {
    console.log("   Diagnosis failed:", error.message);
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

directClaimFix().catch(console.error);