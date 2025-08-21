// scripts/deploy.js - FIXED VERSION for ethers v6
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log("🌱 Deploying AgroYield v2.0 - PRODUCTION VERSION...");
  console.log("Deployer:", deployer.address);
  
  // Get balance - fixed for ethers v6
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "MATIC");

  // Amoy testnet USDC address
  const AMOY_USDC = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";
  
  console.log("Using USDC:", AMOY_USDC);
  console.log("Network: Amoy (Chain ID: 80002)");

  const contracts = {};

  try {
    // 1. Deploy ProjectFactory
    console.log("\n📋 Deploying ProjectFactory...");
    const ProjectFactory = await ethers.getContractFactory("ProjectFactory");
    contracts.projectFactory = await ProjectFactory.deploy();
    await contracts.projectFactory.waitForDeployment();
    const projectFactoryAddress = await contracts.projectFactory.getAddress();
    console.log("✅ ProjectFactory:", projectFactoryAddress);

    // 2. Deploy InvestmentManager
    console.log("\n💰 Deploying InvestmentManager...");
    const InvestmentManager = await ethers.getContractFactory("InvestmentManager");
    contracts.investmentManager = await InvestmentManager.deploy(
      projectFactoryAddress,
      AMOY_USDC
    );
    await contracts.investmentManager.waitForDeployment();
    const investmentManagerAddress = await contracts.investmentManager.getAddress();
    console.log("✅ InvestmentManager:", investmentManagerAddress);

    // 3. Deploy YieldDistributor
    console.log("\n📈 Deploying YieldDistributor...");
    const YieldDistributor = await ethers.getContractFactory("YieldDistributor");
    contracts.yieldDistributor = await YieldDistributor.deploy(
      projectFactoryAddress,
      investmentManagerAddress
    );
    await contracts.yieldDistributor.waitForDeployment();
    const yieldDistributorAddress = await contracts.yieldDistributor.getAddress();
    console.log("✅ YieldDistributor:", yieldDistributorAddress);

    // 4. Deploy GovernanceModule
    console.log("\n🏛️ Deploying GovernanceModule...");
    const GovernanceModule = await ethers.getContractFactory("GovernanceModule");
    contracts.governanceModule = await GovernanceModule.deploy();
    await contracts.governanceModule.waitForDeployment();
    const governanceModuleAddress = await contracts.governanceModule.getAddress();
    console.log("✅ GovernanceModule:", governanceModuleAddress);

    // Save deployment information
    const deploymentInfo = {
      network: "amoy",
      chainId: 80002,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      usdcAddress: AMOY_USDC,
      version: "2.0.0-production",
      contracts: {
        projectFactory: projectFactoryAddress,
        investmentManager: investmentManagerAddress,
        yieldDistributor: yieldDistributorAddress,
        governanceModule: governanceModuleAddress
      }
    };

    // Create directories
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    const frontendDir = path.join(__dirname, "..", "frontend", "src", "contracts");

    [deploymentsDir, frontendDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    // Save deployment record
    fs.writeFileSync(
      path.join(deploymentsDir, "amoy-deployment-production.json"),
      JSON.stringify(deploymentInfo, null, 2)
    );

    // Frontend configuration
    const frontendConfig = {
      projectFactory: projectFactoryAddress,
      investmentManager: investmentManagerAddress,
      yieldDistributor: yieldDistributorAddress,
      governanceModule: governanceModuleAddress,
      network: "amoy",
      chainId: 80002,
      usdcAddress: AMOY_USDC,
      rpcUrl: "https://rpc-amoy.polygon.technology",
      explorerUrl: "https://amoy.polygonscan.com",
      version: deploymentInfo.version
    };

    fs.writeFileSync(
      path.join(frontendDir, "amoy-addresses.json"),
      JSON.stringify(frontendConfig, null, 2)
    );

    // Update frontend .env.local with new addresses
    const envPath = path.join(__dirname, "..", "frontend", ".env.local");
    let envContent = "";
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    } else {
      envContent = `# AgroYield Contract Addresses - Auto-generated
# Pinata IPFS Configuration (add your own)
REACT_APP_PINATA_API_KEY=your_pinata_api_key
REACT_APP_PINATA_SECRET_KEY=your_pinata_secret_key
REACT_APP_PINATA_JWT=your_pinata_jwt_token

# Network configuration
REACT_APP_USDC_ADDRESS=${AMOY_USDC}
REACT_APP_NETWORK_NAME=amoy
REACT_APP_CHAIN_ID=80002
REACT_APP_RPC_URL=https://rpc-amoy.polygon.technology
REACT_APP_EXPLORER_URL=https://amoy.polygonscan.com

# App Configuration
REACT_APP_APP_NAME="AgroYield"
REACT_APP_APP_VERSION="2.0.0"
`;
    }

    // Update or add contract addresses
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

    console.log("\n🎉 AgroYield Production Deployment Complete!");
    console.log("==========================================");
    
    console.log("\n📋 Contract Addresses:");
    console.log(`   ProjectFactory: ${projectFactoryAddress}`);
    console.log(`   InvestmentManager: ${investmentManagerAddress}`);
    console.log(`   YieldDistributor: ${yieldDistributorAddress}`);
    console.log(`   GovernanceModule: ${governanceModuleAddress}`);
    
    console.log("\n💰 USDC Integration:");
    console.log(`   USDC Address: ${AMOY_USDC}`);
    console.log(`   Min Investment: 10 USDC`);
    console.log(`   Max Investment: 10,000 USDC`);
    console.log(`   Platform Fee: 1.5%`);
    
    console.log("\n🔗 Verification Links:");
    console.log(`   ProjectFactory: https://amoy.polygonscan.com/address/${projectFactoryAddress}`);
    console.log(`   InvestmentManager: https://amoy.polygonscan.com/address/${investmentManagerAddress}`);
    console.log(`   USDC Contract: https://amoy.polygonscan.com/address/${AMOY_USDC}`);
    
    console.log("\n📱 Frontend Setup:");
    console.log("   Contract addresses have been updated in frontend/.env.local");
    console.log("   Run: cd frontend && npm start");
    
    console.log("\n🔍 Verification Commands:");
    console.log(`   npx hardhat verify --network amoy ${projectFactoryAddress}`);
    console.log(`   npx hardhat verify --network amoy ${investmentManagerAddress} "${projectFactoryAddress}" "${AMOY_USDC}"`);
    console.log(`   npx hardhat verify --network amoy ${yieldDistributorAddress} "${projectFactoryAddress}" "${investmentManagerAddress}"`);
    console.log(`   npx hardhat verify --network amoy ${governanceModuleAddress}`);
    
    console.log("\n🚀 Ready for Production Use!");

    // Test basic functionality
    console.log("\n🧪 Testing Basic Contract Functions...");
    
    try {
      const totalProjects = await contracts.projectFactory.getTotalProjects();
      console.log(`   Total Projects: ${totalProjects.toString()}`);
      
      const platformStats = await contracts.projectFactory.getPlatformStats();
      console.log(`   Platform Users: ${platformStats.totalUsers.toString()}`);
      
      console.log("✅ Contracts are responding correctly!");
    } catch (testError) {
      console.log("⚠️  Contract test failed, but deployment was successful");
      console.log("   Error:", testError.message);
    }

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });