const fs = require('fs');
const path = require('path');

// Contract names to generate ABIs for (CORRECTED LIST)
const contractNames = [
  'ProjectFactory',
  'InvestmentManager', 
  'YieldDistributor',
  'GovernanceModule'
  // Removed: 'IdentityRegistry', 'OracleIntegration' (these don't exist in your project)
];

// Source and destination paths
const artifactsDir = path.join(__dirname, '..', 'artifacts', 'contracts');
const outputDir = path.join(__dirname, '..', 'frontend', 'src', 'contracts');

console.log('🔧 ABI Generation Starting...');
console.log('Artifacts directory:', artifactsDir);
console.log('Output directory:', outputDir);

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log('✅ Created output directory');
}

// Generate ABI files
let successCount = 0;
let failCount = 0;

contractNames.forEach(contractName => {
  const artifactPath = path.join(artifactsDir, `${contractName}.sol`, `${contractName}.json`);
  
  try {
    if (fs.existsSync(artifactPath)) {
      // Add error handling for require()
      try {
        const artifact = require(artifactPath);
        
        if (!artifact.abi) {
          console.warn(`⚠️  No ABI found in artifact for ${contractName}`);
          failCount++;
          return;
        }
        
        const abi = artifact.abi;
        const outputPath = path.join(outputDir, `${contractName}.json`);
        
        fs.writeFileSync(
          outputPath,
          JSON.stringify(abi, null, 2),
          'utf-8'
        );
        
        console.log(`✅ Generated ABI for ${contractName} (${abi.length} functions)`);
        successCount++;
        
      } catch (requireError) {
        console.error(`❌ Error reading artifact for ${contractName}:`, requireError.message);
        failCount++;
      }
      
    } else {
      console.warn(`❌ Artifact not found for ${contractName} at ${artifactPath}`);
      failCount++;
    }
  } catch (error) {
    console.error(`❌ Error processing ${contractName}:`, error.message);
    failCount++;
  }
});

console.log('\n📊 ABI Generation Summary:');
console.log(`✅ Successful: ${successCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`📋 Total: ${contractNames.length}`);

if (successCount > 0) {
  console.log('\n🎉 ABI generation complete!');
  console.log('📁 ABIs saved to:', outputDir);
  
  // List generated files
  console.log('\n📋 Generated files:');
  try {
    const files = fs.readdirSync(outputDir);
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const filePath = path.join(outputDir, file);
        const stats = fs.statSync(filePath);
        console.log(`   ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
      }
    });
  } catch (e) {
    console.log('   Could not list files');
  }
} else {
  console.log('\n❌ No ABIs were generated successfully!');
  console.log('💡 Make sure contracts are compiled first: npx hardhat compile');
}

// Verify the contracts directory structure
console.log('\n🔍 Checking artifacts structure:');
try {
  if (fs.existsSync(artifactsDir)) {
    const contractDirs = fs.readdirSync(artifactsDir);
    console.log('Available contract directories:');
    contractDirs.forEach(dir => {
      console.log(`   📁 ${dir}`);
    });
  } else {
    console.log('❌ Artifacts directory does not exist!');
    console.log('💡 Run: npx hardhat compile');
  }
} catch (e) {
  console.log('Could not check artifacts structure');
}