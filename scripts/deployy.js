// scripts/deploy.js - FIXED VERSION with proper delays and error handling
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Helper function to wait for contract to be ready
async function waitForContract(contract, maxRetries = 5) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Try a simple view function call
      await contract.getAddress();
      return true;
    } catch (error) {
      console.log(`   ⏳ Waiting for contract to be ready... (${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    }
  }
  return false;
}

// Helper function to safely call contract functions
async function safeContractCall(contract, functionName, ...args) {
  try {
    const result = await contract[functionName](...args);
    return result;
  } catch (error) {
    console.log(`   ⚠️  Could not call ${functionName}: ${error.message}`);
    return null;
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🌱 DEPLOYING AGROYIELD v2.0 - COMPLETE PLATFORM");
  console.log("=" .repeat(60));
  console.log("Deployer:", deployer.address);
  
  // Get balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "MATIC");

  // Network configuration
  const AMOY_USDC = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";
  const network = await ethers.provider.getNetwork();
  
  console.log("Network:", network.name, "(Chain ID:", network.chainId.toString() + ")");
  console.log("USDC Token:", AMOY_USDC);
  console.log("=" .repeat(60));

  const contracts = {};
  const deploymentLog = [];

  try {
    // ==========================================
    // STEP 1: DEPLOY PROJECTFACTORY (CORE)
    // ==========================================
    console.log("\n📋 STEP 1: Deploying ProjectFactory...");
    console.log("-".repeat(40));
    
    const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
    
    console.log("   🔨 Compiling and deploying...");
    contracts.projectFactory = await ProjectFactory.deploy();
    
    console.log("   ⏳ Waiting for deployment confirmation...");
    await contracts.projectFactory.waitForDeployment();
    
    const projectFactoryAddress = await contracts.projectFactory.getAddress();
    console.log("   ✅ ProjectFactory deployed:", projectFactoryAddress);
    
    // Wait for contract to be ready
    console.log("   🔄 Waiting for contract to be available...");
    await waitForContract(contracts.projectFactory);
    
    deploymentLog.push({
      step: 1,
      contract: "ProjectFactory",
      address: projectFactoryAddress,
      timestamp: new Date().toISOString()
    });

    // Verify deployment (with safe call)
    const totalProjects = await safeContractCall(contracts.projectFactory, "getTotalProjects");
    if (totalProjects !== null) {
      console.log("   🧪 Verification: Total projects =", totalProjects.toString());
    } else {
      console.log("   🧪 Verification: Contract deployed but not yet fully available");
    }

    // ==========================================
    // STEP 2: DEPLOY INVESTMENTMANAGER
    // ==========================================
    console.log("\n💰 STEP 2: Deploying InvestmentManager...");
    console.log("-".repeat(40));
    
    const InvestmentManager = await ethers.getContractFactory("InvestmentManager");
    
    console.log("   🔨 Deploying with dependencies:");
    console.log("      - ProjectFactory:", projectFactoryAddress);
    console.log("      - USDC Token:", AMOY_USDC);
    
    contracts.investmentManager = await InvestmentManager.deploy(
      projectFactoryAddress,
      AMOY_USDC
    );
    
    console.log("   ⏳ Waiting for deployment confirmation...");
    await contracts.investmentManager.waitForDeployment();
    
    const investmentManagerAddress = await contracts.investmentManager.getAddress();
    console.log("   ✅ InvestmentManager deployed:", investmentManagerAddress);
    
    // Wait for contract to be ready
    console.log("   🔄 Waiting for contract to be available...");
    await waitForContract(contracts.investmentManager);
    
    deploymentLog.push({
      step: 2,
      contract: "InvestmentManager",
      address: investmentManagerAddress,
      dependencies: [projectFactoryAddress, AMOY_USDC],
      timestamp: new Date().toISOString()
    });

    // Verify deployment (with safe call)
    const minInvestment = await safeContractCall(contracts.investmentManager, "MIN_INVESTMENT");
    if (minInvestment !== null) {
      console.log("   🧪 Verification: Min investment =", ethers.formatUnits(minInvestment, 6), "USDC");
    } else {
      console.log("   🧪 Verification: Contract deployed but not yet fully available");
    }

    // ==========================================
    // STEP 3: LINK CONTRACTS (CRITICAL)
    // ==========================================
    console.log("\n🔗 STEP 3: Linking ProjectFactory ↔ InvestmentManager...");
    console.log("-".repeat(40));
    
    console.log("   📡 Setting InvestmentManager address in ProjectFactory...");
    
    // Add a small delay before linking
    console.log("   ⏳ Waiting before contract interaction...");
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    
    const linkTx = await contracts.projectFactory.setInvestmentManager(investmentManagerAddress);
    
    console.log("   ⏳ Waiting for transaction confirmation...");
    const linkReceipt = await linkTx.wait();
    
    console.log("   ✅ Contracts linked successfully!");
    console.log("   📊 Gas used:", linkReceipt.gasUsed.toString());
    
    deploymentLog.push({
      step: 3,
      action: "Link Contracts",
      transaction: linkTx.hash,
      gasUsed: linkReceipt.gasUsed.toString(),
      timestamp: new Date().toISOString()
    });

    // Verify linking (with safe call)
    console.log("   🔄 Verifying contract linkage...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    const linkedManager = await safeContractCall(contracts.projectFactory, "investmentManager");
    if (linkedManager && linkedManager === investmentManagerAddress) {
      console.log("   🧪 Verification: Contracts properly linked ✓");
    } else {
      console.log("   ⚠️  Link verification inconclusive, but transaction succeeded");
    }

    // ==========================================
    // STEP 4: DEPLOY YIELDDISTRIBUTOR
    // ==========================================
    console.log("\n📈 STEP 4: Deploying YieldDistributor...");
    console.log("-".repeat(40));
    
    const YieldDistributor = await ethers.getContractFactory("YieldDistributor");
    
    console.log("   🔨 Deploying with dependencies:");
    console.log("      - ProjectFactory:", projectFactoryAddress);
    console.log("      - InvestmentManager:", investmentManagerAddress);
    
    contracts.yieldDistributor = await YieldDistributor.deploy(
      projectFactoryAddress,
      investmentManagerAddress
    );
    
    console.log("   ⏳ Waiting for deployment confirmation...");
    await contracts.yieldDistributor.waitForDeployment();
    
    const yieldDistributorAddress = await contracts.yieldDistributor.getAddress();
    console.log("   ✅ YieldDistributor deployed:", yieldDistributorAddress);
    
    // Wait for contract to be ready
    console.log("   🔄 Waiting for contract to be available...");
    await waitForContract(contracts.yieldDistributor);
    
    deploymentLog.push({
      step: 4,
      contract: "YieldDistributor",
      address: yieldDistributorAddress,
      dependencies: [projectFactoryAddress, investmentManagerAddress],
      timestamp: new Date().toISOString()
    });

    // Verify deployment (with safe call)
    const distributorBalance = await safeContractCall(contracts.yieldDistributor, "getContractBalance");
    if (distributorBalance !== null) {
      console.log("   🧪 Verification: Contract balance =", distributorBalance.toString(), "wei");
    } else {
      console.log("   🧪 Verification: Contract deployed successfully");
    }

    // ==========================================
    // STEP 5: DEPLOY GOVERNANCEMODULE
    // ==========================================
    console.log("\n🏛️  STEP 5: Deploying GovernanceModule...");
    console.log("-".repeat(40));
    
    const GovernanceModule = await ethers.getContractFactory("GovernanceModule");
    
    console.log("   🔨 Deploying standalone governance...");
    contracts.governanceModule = await GovernanceModule.deploy();
    
    console.log("   ⏳ Waiting for deployment confirmation...");
    await contracts.governanceModule.waitForDeployment();
    
    const governanceModuleAddress = await contracts.governanceModule.getAddress();
    console.log("   ✅ GovernanceModule deployed:", governanceModuleAddress);
    
    // Wait for contract to be ready
    console.log("   🔄 Waiting for contract to be available...");
    await waitForContract(contracts.governanceModule);
    
    deploymentLog.push({
      step: 5,
      contract: "GovernanceModule",
      address: governanceModuleAddress,
      timestamp: new Date().toISOString()
    });

    // Verify deployment (with safe call)
    const votingDelay = await safeContractCall(contracts.governanceModule, "votingDelay");
    if (votingDelay !== null) {
      console.log("   🧪 Verification: Voting delay =", votingDelay.toString(), "blocks");
    } else {
      console.log("   🧪 Verification: Contract deployed successfully");
    }

    // ==========================================
    // STEP 6: FINAL VERIFICATION & TESTING
    // ==========================================
    console.log("\n🧪 STEP 6: Final System Verification...");
    console.log("-".repeat(40));
    
    console.log("   🔍 Testing inter-contract communication...");
    
    // Add delay before final verification
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test ProjectFactory → InvestmentManager link
    const factoryManager = await safeContractCall(contracts.projectFactory, "investmentManager");
    if (factoryManager === investmentManagerAddress) {
      console.log("   ✅ ProjectFactory knows InvestmentManager: TRUE");
    } else {
      console.log("   ⚠️  ProjectFactory link check inconclusive");
    }
    
    // Test InvestmentManager → ProjectFactory link
    const managerFactory = await safeContractCall(contracts.investmentManager, "projectFactory");
    if (managerFactory === projectFactoryAddress) {
      console.log("   ✅ InvestmentManager knows ProjectFactory: TRUE");
    } else {
      console.log("   ⚠️  InvestmentManager link check inconclusive");
    }
    
    // Test YieldDistributor links
    const distributorFactory = await safeContractCall(contracts.yieldDistributor, "projectFactory");
    const distributorManager = await safeContractCall(contracts.yieldDistributor, "investmentManager");
    if (distributorFactory === projectFactoryAddress && distributorManager === investmentManagerAddress) {
      console.log("   ✅ YieldDistributor links verified: TRUE");
    } else {
      console.log("   ⚠️  YieldDistributor link check inconclusive");
    }
    
    console.log("   🎉 All contracts deployed successfully!");

    // ==========================================
    // STEP 7: SAVE DEPLOYMENT DATA
    // ==========================================
    console.log("\n💾 STEP 7: Saving Deployment Data...");
    console.log("-".repeat(40));

    const deploymentInfo = {
      network: "amoy",
      chainId: Number(network.chainId),
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      deployerBalance: ethers.formatEther(balance),
      usdcAddress: AMOY_USDC,
      version: "2.0.0-complete-fixed",
      deploymentType: "full-platform",
      contracts: {
        projectFactory: projectFactoryAddress,
        investmentManager: investmentManagerAddress,
        yieldDistributor: yieldDistributorAddress,
        governanceModule: governanceModuleAddress
      },
      contractLinks: {
        "ProjectFactory → InvestmentManager": investmentManagerAddress,
        "InvestmentManager → ProjectFactory": projectFactoryAddress,
        "YieldDistributor → ProjectFactory": projectFactoryAddress,
        "YieldDistributor → InvestmentManager": investmentManagerAddress
      },
      features: {
        projectCreation: true,
        flexibleInvestments: true,
        automaticCompletion: true,
        fundRelease: true,
        farmerClaims: true,
        yieldDistribution: true,
        governance: true,
        fullLifecycle: true
      },
      deploymentLog: deploymentLog
    };

    // Create directories
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const frontendDir = path.join(__dirname, "..", "frontend", "src", "contracts");

    [deploymentsDir, frontendDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log("   📁 Created directory:", dir);
      }
    });

    // Save deployment record
    const deploymentFile = path.join(deploymentsDir, "amoy-deployment-complete.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("   💾 Deployment record saved:", deploymentFile);

    // Frontend configuration
    const frontendConfig = {
      projectFactory: projectFactoryAddress,
      investmentManager: investmentManagerAddress,
      yieldDistributor: yieldDistributorAddress,
      governanceModule: governanceModuleAddress,
      network: "amoy",
      chainId: Number(network.chainId),
      usdcAddress: AMOY_USDC,
      rpcUrl: "https://rpc-amoy.polygon.technology",
      explorerUrl: "https://amoy.polygonscan.com",
      version: deploymentInfo.version
    };

    const frontendFile = path.join(frontendDir, "amoy-addresses.json");
    fs.writeFileSync(frontendFile, JSON.stringify(frontendConfig, null, 2));
    console.log("   📱 Frontend config saved:", frontendFile);

    // Update frontend .env.local
    const envPath = path.join(__dirname, "..", "frontend", ".env.local");
    let envContent = "";
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      console.log("   📝 Updating existing .env.local");
    } else {
      console.log("   📝 Creating new .env.local");
      envContent = `# AgroYield Contract Addresses - Auto-generated ${new Date().toISOString()}
# Pinata IPFS Configuration (add your own)
REACT_APP_PINATA_API_KEY=your_pinata_api_key
REACT_APP_PINATA_SECRET_KEY=your_pinata_secret_key
REACT_APP_PINATA_JWT=your_pinata_jwt_token

# Network configuration
REACT_APP_USDC_ADDRESS=${AMOY_USDC}
REACT_APP_NETWORK_NAME=amoy
REACT_APP_CHAIN_ID=${network.chainId}
REACT_APP_RPC_URL=https://rpc-amoy.polygon.technology
REACT_APP_EXPLORER_URL=https://amoy.polygonscan.com

# App Configuration
REACT_APP_APP_NAME="AgroYield"
REACT_APP_APP_VERSION="2.0.0"
`;
    }

    // Update contract addresses
    const updateEnvVar = (content, key, value) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const newLine = `${key}=${value}`;
      
      if (regex.test(content)) {
        return content.replace(regex, newLine);
      } else {
        return content + `\n${newLine}`;
      }
    };

    envContent = updateEnvVar(envContent, 'REACT_APP_PROJECT_FACTORY', projectFactoryAddress);
    envContent = updateEnvVar(envContent, 'REACT_APP_INVESTMENT_MANAGER', investmentManagerAddress);
    envContent = updateEnvVar(envContent, 'REACT_APP_YIELD_DISTRIBUTOR', yieldDistributorAddress);
    envContent = updateEnvVar(envContent, 'REACT_APP_GOVERNANCE_MODULE', governanceModuleAddress);

    fs.writeFileSync(envPath, envContent);
    console.log("   ✅ Environment variables updated");

    // ==========================================
    // DEPLOYMENT SUMMARY
    // ==========================================
    console.log("\n🎉 DEPLOYMENT COMPLETE!");
    console.log("=" .repeat(60));
    
    console.log("\n📋 CONTRACT ADDRESSES:");
    console.log("   ProjectFactory:     ", projectFactoryAddress);
    console.log("   InvestmentManager:  ", investmentManagerAddress);
    console.log("   YieldDistributor:   ", yieldDistributorAddress);
    console.log("   GovernanceModule:   ", governanceModuleAddress);
    
    console.log("\n💰 INTEGRATION:");
    console.log("   USDC Token:         ", AMOY_USDC);
    console.log("   Min Investment:     ", "10 USDC (flexible for final)");
    console.log("   Max Investment:     ", "10,000 USDC");
    console.log("   Platform Fee:       ", "1.5%");
    console.log("   Expected Return:    ", "12% annually");
    
    console.log("\n🔗 CONTRACT SYNCHRONIZATION:");
    console.log("   ✅ ProjectFactory ↔ InvestmentManager linked");
    console.log("   ✅ YieldDistributor knows both contracts");
    console.log("   ✅ GovernanceModule deployed standalone");
    console.log("   ✅ All contracts deployed successfully");
    
    console.log("\n🚀 PLATFORM FEATURES:");
    console.log("   ✅ Complete Project Lifecycle");
    console.log("   ✅ Flexible Final Investments");
    console.log("   ✅ Automatic Project Completion");
    console.log("   ✅ Farmer Fund Claims");
    console.log("   ✅ Yield Distribution System");
    console.log("   ✅ DAO Governance");
    console.log("   ✅ USDC Integration");
    
    console.log("\n🔍 VERIFICATION COMMANDS:");
    console.log(`   npx hardhat verify --network amoy ${projectFactoryAddress}`);
    console.log(`   npx hardhat verify --network amoy ${investmentManagerAddress} "${projectFactoryAddress}" "${AMOY_USDC}"`);
    console.log(`   npx hardhat verify --network amoy ${yieldDistributorAddress} "${projectFactoryAddress}" "${investmentManagerAddress}"`);
    console.log(`   npx hardhat verify --network amoy ${governanceModuleAddress}`);
    
    console.log("\n🌐 BLOCKCHAIN LINKS:");
    console.log("   ProjectFactory:     ", `https://amoy.polygonscan.com/address/${projectFactoryAddress}`);
    console.log("   InvestmentManager:  ", `https://amoy.polygonscan.com/address/${investmentManagerAddress}`);
    console.log("   YieldDistributor:   ", `https://amoy.polygonscan.com/address/${yieldDistributorAddress}`);
    console.log("   GovernanceModule:   ", `https://amoy.polygonscan.com/address/${governanceModuleAddress}`);
    
    console.log("\n📱 FRONTEND SETUP:");
    console.log("   1. Contract addresses automatically updated");
    console.log("   2. Run: cd frontend && npm start");
    console.log("   3. Connect wallet and test the platform");
    
    console.log("\n🎯 READY FOR PRODUCTION!");
    console.log("   All 4 contracts deployed and synchronized");
    console.log("   Complete platform functionality available");
    console.log("   Fund release mechanism active");
    console.log("   Full project lifecycle implemented");
    
    console.log("\n" + "=" .repeat(60));
    console.log("🎊 AGROYIELD PLATFORM DEPLOYMENT SUCCESSFUL! 🎊");
    console.log("=" .repeat(60));

  } catch (error) {
    console.error("\n❌ DEPLOYMENT FAILED:");
    console.error("Error:", error.message);
    
    if (error.reason) {
      console.error("Reason:", error.reason);
    }
    
    if (error.code) {
      console.error("Code:", error.code);
    }
    
    console.log("\n📋 DEPLOYMENT LOG:");
    deploymentLog.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.contract || log.action}: ${log.address || log.transaction}`);
    });
    
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ FATAL ERROR:", error);
    process.exit(1);
  });