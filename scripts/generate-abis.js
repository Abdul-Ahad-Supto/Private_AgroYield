const fs = require('fs');
const path = require('path');

// Contract names to generate ABIs for
const contractNames = [
  'ProjectFactory',
  'InvestmentManager',
  'IdentityRegistry',
  'OracleIntegration',
  'YieldDistributor',
  'GovernanceModule'
];

// Source and destination paths
const artifactsDir = path.join(__dirname, '..', 'artifacts', 'contracts');
const outputDir = path.join(__dirname, '..', 'frontend', 'src', 'contracts');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Generate ABI files
contractNames.forEach(contractName => {
  const artifactPath = path.join(artifactsDir, `${contractName}.sol`, `${contractName}.json`);
  
  if (fs.existsSync(artifactPath)) {
    const artifact = require(artifactPath);
    const abi = artifact.abi;
    
    fs.writeFileSync(
      path.join(outputDir, `${contractName}.json`),
      JSON.stringify(abi, null, 2),
      'utf-8'
    );
    
    console.log(`Generated ABI for ${contractName}`);
  } else {
    console.warn(`Artifact not found for ${contractName} at ${artifactPath}`);
  }
});

console.log('ABI generation complete!');
