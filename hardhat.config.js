require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("hardhat-gas-reporter");
require("solidity-coverage");

const { PRIVATE_KEY, POLYGONSCAN_API_KEY, AMOY_RPC_URL } = process.env;

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { 
        enabled: true, 
        runs: 200 
      },
      viaIR: true, // Enable IR optimizer to fix "Stack too deep"
      evmVersion: "paris",
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
    },
    amoy: {
      url: AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      // Use dynamic gas pricing (network will estimate optimal prices)
      gas: 6000000,
      timeout: 60000, // 60 seconds timeout
    },
    // Add Polygon mainnet for future deployment
    polygon: {
      url: "https://polygon-rpc.com",
      chainId: 137,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      gasPrice: 30000000000, // 30 gwei
    },
  },
  etherscan: {
    apiKey: { 
      polygonAmoy: POLYGONSCAN_API_KEY || "",
      polygon: POLYGONSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com/"
        }
      }
    ]
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === "true",
    currency: "USD",
    gasPrice: 20,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  mocha: {
    timeout: 60000, // 60 seconds
  },
};