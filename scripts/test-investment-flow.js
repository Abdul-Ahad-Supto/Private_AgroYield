// scripts/ultimate-claim-fix.js - FINAL SOLUTION FOR CLAIM ISSUE
const { ethers } = require("hardhat");

async function ultimateClaimFix() {
  console.log("🎯 ULTIMATE CLAIM FIX - SOLVING THE UNDEFINED ERROR");
  console.log("=" .repeat(60));
  
  const PROJECT_FACTORY = "0x12C784201524c9F4971875A07fcbf402134A285f";
  const USDC_ADDRESS = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";
  
  try {
    const [signer] = await ethers.getSigners();
    console.log("Connected account:", await signer.getAddress());
    
    // ✅ METHOD 1: Load contract with explicit ABI
    console.log("\n🔧 METHOD 1: Loading contract with explicit signer...");
    
    let projectFactory;
    try {
      // Load contract with explicit signer attachment
      projectFactory = await ethers.getContractAt("ProjectFactory", PROJECT_FACTORY, signer);
      console.log("✅ Contract loaded with signer");
      
      // Verify the function exists in multiple ways
      console.log("📋 Function verification:");
      console.log("   Contract address:", await projectFactory.getAddress());
      console.log("   Has interface:", !!projectFactory.interface);
      console.log("   Has claimProjectFunds:", typeof projectFactory.claimProjectFunds);
      
      // Try to access the function directly
      if (projectFactory.claimProjectFunds) {
        console.log("   ✅ claimProjectFunds accessible as:", typeof projectFactory.claimProjectFunds);
      } else {
        console.log("   ❌ claimProjectFunds not accessible");
      }
      
    } catch (error) {
      console.log("❌ Method 1 failed:", error.message);
    }
    
    // ✅ METHOD 2: Re-create contract from scratch
    console.log("\n🔧 METHOD 2: Re-creating contract from artifacts...");
    
    try {
      // Get the artifact directly
      const ProjectFactoryArtifact = await ethers.getContractFactory("ProjectFactory");
      const newProjectFactory = ProjectFactoryArtifact.attach(PROJECT_FACTORY);
      
      console.log("✅ Contract recreated from factory");
      console.log("   Contract address:", await newProjectFactory.getAddress());
      console.log("   Has claimProjectFunds:", typeof newProjectFactory.claimProjectFunds);
      
      // Try this version
      projectFactory = newProjectFactory;
      
    } catch (error) {
      console.log("❌ Method 2 failed:", error.message);
    }
    
    // ✅ METHOD 3: Manual function call using interface
    console.log("\n🔧 METHOD 3: Manual function call preparation...");
    
    try {
      // Get the function signature manually
      const iface = projectFactory.interface;
      const claimFunction = iface.getFunction("claimProjectFunds");
      
      console.log("✅ Function signature found:");
      console.log("   Name:", claimFunction.name);
      console.log("   Selector:", claimFunction.selector);
      console.log("   Inputs:", claimFunction.inputs.length);
      
      // Encode the function call manually
      const functionData = iface.encodeFunctionData("claimProjectFunds", [1]);
      console.log("   Encoded data:", functionData.substring(0, 20) + "...");
      
    } catch (error) {
      console.log("❌ Method 3 failed:", error.message);
    }
    
    // ✅ ACTUAL CLAIM ATTEMPT WITH MULTIPLE STRATEGIES
    console.log("\n🚀 EXECUTING CLAIM WITH MULTIPLE STRATEGIES...");
    console.log("-".repeat(50));
    
    // Strategy 1: Direct function call with await
    console.log("📋 STRATEGY 1: Direct function call");
    try {
      console.log("   Checking function type:", typeof projectFactory.claimProjectFunds);
      
      if (typeof projectFactory.claimProjectFunds === 'function') {
        const gasEstimate = await projectFactory.estimateGas.claimProjectFunds(1);
        console.log("   ✅ Gas estimate successful:", gasEstimate.toString());
        
        const tx = await projectFactory.claimProjectFunds(1, {
          gasLimit: gasEstimate.mul(130).div(100)
        });
        
        console.log("   ✅ Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("   ✅ SUCCESS! Gas used:", receipt.gasUsed.toString());
        
        return; // Success!
        
      } else {
        console.log("   ❌ Function not callable");
      }
    } catch (error) {
      console.log("   ❌ Strategy 1 failed:", error.message);
    }
    
    // Strategy 2: Using contract interface directly
    console.log("\n📋 STRATEGY 2: Interface-based call");
    try {
      const iface = projectFactory.interface;
      const functionData = iface.encodeFunctionData("claimProjectFunds", [1]);
      
      const tx = await signer.sendTransaction({
        to: PROJECT_FACTORY,
        data: functionData,
        gasLimit: 300000
      });
      
      console.log("   ✅ Raw transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("   ✅ SUCCESS! Gas used:", receipt.gasUsed.toString());
      
      return; // Success!
      
    } catch (error) {
      console.log("   ❌ Strategy 2 failed:", error.message);
    }
    
    // Strategy 3: Recreate contract with provider
    console.log("\n📋 STRATEGY 3: Provider-based recreation");
    try {
      const provider = ethers.provider;
      const contractFactory = await ethers.getContractFactory("ProjectFactory");
      const contract = new ethers.Contract(PROJECT_FACTORY, contractFactory.interface, signer);
      
      console.log("   ✅ Contract recreated with provider");
      console.log("   Function available:", typeof contract.claimProjectFunds);
      
      if (typeof contract.claimProjectFunds === 'function') {
        const tx = await contract.claimProjectFunds(1, {
          gasLimit: 300000
        });
        
        console.log("   ✅ Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("   ✅ SUCCESS! Gas used:", receipt.gasUsed.toString());
        
        return; // Success!
      }
      
    } catch (error) {
      console.log("   ❌ Strategy 3 failed:", error.message);
    }
    
    // Strategy 4: Using the raw ABI
    console.log("\n📋 STRATEGY 4: Raw ABI approach");
    try {
      // Load the ABI from the artifacts
      const fs = require('fs');
      const path = require('path');
      
      const artifactPath = path.join(__dirname, '../artifacts/contracts/ProjectFactory.sol/ProjectFactory.json');
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      
      const contract = new ethers.Contract(PROJECT_FACTORY, artifact.abi, signer);
      
      console.log("   ✅ Contract created with raw ABI");
      console.log("   Function available:", typeof contract.claimProjectFunds);
      
      if (typeof contract.claimProjectFunds === 'function') {
        const tx = await contract.claimProjectFunds(1);
        
        console.log("   ✅ Transaction sent:", tx.hash);
        const receipt = await tx.wait();
        console.log("   ✅ SUCCESS! Gas used:", receipt.gasUsed.toString());
        
        return; // Success!
      }
      
    } catch (error) {
      console.log("   ❌ Strategy 4 failed:", error.message);
    }
    
    // If all strategies fail, provide detailed diagnosis
    console.log("\n❌ ALL STRATEGIES FAILED!");
    console.log("🔍 DETAILED DIAGNOSIS:");
    console.log("-".repeat(30));
    
    // Check the actual contract code
    const contractCode = await ethers.provider.getCode(PROJECT_FACTORY);
    console.log("   Contract has code:", contractCode !== "0x" ? "✅ YES" : "❌ NO");
    console.log("   Code length:", contractCode.length);
    
    // Check if it's a proxy
    const proxyCheck = contractCode.includes("6080604052") || contractCode.includes("363d3d373d3d3d363d73");
    console.log("   Possible proxy:", proxyCheck ? "⚠️ YES" : "✅ NO");
    
    // List available functions
    try {
      const iface = projectFactory.interface;
      const functions = Object.keys(iface.functions);
      console.log("\n   Available functions:");
      functions.slice(0, 10).forEach(func => {
        console.log(`     ${func}`);
      });
      if (functions.length > 10) {
        console.log(`     ... and ${functions.length - 10} more`);
      }
    } catch (error) {
      console.log("   Could not list functions:", error.message);
    }
    
    console.log("\n🔧 POSSIBLE SOLUTIONS:");
    console.log("1. The contract might be a proxy - check if implementation is different");
    console.log("2. The function might have a different name or signature");
    console.log("3. There might be a permission issue preventing the call");
    console.log("4. The contract might need to be redeployed");
    console.log("5. Try calling the function from a different account");
    
    // Final verification
    console.log("\n🧪 FINAL VERIFICATION:");
    try {
      const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
      const balance = await usdc.balanceOf(await signer.getAddress());
      console.log("   USDC balance check: ✅ SUCCESS");
      console.log("   Your USDC balance:", ethers.formatUnits(balance, 6), "USDC");
      
      const project = await projectFactory.getProject(1);
      console.log("   Project data check: ✅ SUCCESS");
      console.log("   Current funding:", ethers.formatUnits(project.currentAmountUSDC, 6), "USDC");
      console.log("   Target funding:", ethers.formatUnits(project.targetAmountUSDC, 6), "USDC");
      console.log("   Funds released:", project.fundsReleased);
      
      console.log("\n   🎯 THE PROBLEM IS SPECIFICALLY WITH claimProjectFunds!");
      console.log("   Everything else works, so this is a function-specific issue.");
      
    } catch (error) {
      console.log("   ❌ Final verification failed:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Ultimate claim fix failed:", error.message);
  }
}

ultimateClaimFix().catch(console.error);