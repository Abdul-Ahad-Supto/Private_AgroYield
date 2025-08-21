// scripts/check-balances.js - Quick balance check
const { ethers } = require("hardhat");

async function checkBalances() {
  console.log("🔍 CHECKING CONTRACT BALANCES");
  console.log("=" .repeat(50));
  
  // Your deployed contract addresses
  const INVESTMENT_MANAGER = "0xeAe6252029b7e873E1f7C276dC71356E3837e1A8"; // From your deployment
  const PROJECT_FACTORY = "0xaa73C8e86489159Cee9229E5A27D5Ad54839234A";
  const USDC_ADDRESS = "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582";
  
  const investmentManager = await ethers.getContractAt("InvestmentManager", INVESTMENT_MANAGER);
  const projectFactory = await ethers.getContractAt("ProjectFactory", PROJECT_FACTORY);
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
  
  // Check InvestmentManager USDC balance
  const contractUSDCBalance = await usdc.balanceOf(INVESTMENT_MANAGER);
  console.log("InvestmentManager USDC Balance:", ethers.formatUnits(contractUSDCBalance, 6) + " USDC");
  
  // Check project that needs claiming
  const projectId = 1;
  const project = await projectFactory.getProject(projectId);
  console.log("Project needs to release:", ethers.formatUnits(project.currentAmountUSDC, 6) + " USDC");
  
  // Compare
  if (contractUSDCBalance >= project.currentAmountUSDC) {
    console.log("✅ Contract has sufficient USDC balance");
  } else {
    console.log("❌ Contract has insufficient USDC balance!");
    console.log("Shortfall:", ethers.formatUnits(project.currentAmountUSDC - contractUSDCBalance, 6) + " USDC");
  }
  
  // Check linking
  const linkedManager = await projectFactory.investmentManager();
  console.log("Linked InvestmentManager:", linkedManager);
  console.log("Expected InvestmentManager:", INVESTMENT_MANAGER);
  console.log("Linking correct:", linkedManager.toLowerCase() === INVESTMENT_MANAGER.toLowerCase());
}

checkBalances().catch(console.error);