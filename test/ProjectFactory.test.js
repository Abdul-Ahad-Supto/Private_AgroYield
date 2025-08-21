const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ProjectFactory", function () {
  let ProjectFactory;
  let projectFactory;
  let owner, farmer, validator, investor;

  beforeEach(async function () {
    [owner, farmer, validator, investor] = await ethers.getSigners();

    // Deploy ProjectFactory
    ProjectFactory = await ethers.getContractFactory("ProjectFactory");
    projectFactory = await ProjectFactory.deploy();
    await projectFactory.deployed();

    // Grant FARMER_ROLE to the farmer address
    await projectFactory.grantRole(
      await projectFactory.FARMER_ROLE(),
      farmer.address
    );

    // Grant VALIDATOR_ROLE to the validator address
    await projectFactory.grantRole(
      await projectFactory.VALIDATOR_ROLE(),
      validator.address
    );
  });

  it("Should create a new project", async function () {
    // Connect as farmer
    const farmerProjectFactory = projectFactory.connect(farmer);
    
    // Create a project
    const tx = await farmerProjectFactory.createProject(
      "Test Project",
      "Test Description",
      "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      ethers.utils.parseEther("10"),
      90 // days
    );
    
    // Wait for the transaction to be mined
    await tx.wait();
    
    // Get the created project
    const project = await projectFactory.getProject(1);
    
    // Verify project details
    expect(project.title).to.equal("Test Project");
    expect(project.farmer).to.equal(farmer.address);
    expect(project.targetAmount).to.equal(ethers.utils.parseEther("10"));
    expect(project.status).to.equal(0); // Pending status
  });

  it("Should verify a project", async function () {
    // First, create a project as farmer
    const farmerProjectFactory = projectFactory.connect(farmer);
    await farmerProjectFactory.createProject(
      "Test Project",
      "Test Description",
      "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      ethers.utils.parseEther("10"),
      90
    );
    
    // Connect as validator and verify the project
    const validatorProjectFactory = projectFactory.connect(validator);
    await validatorProjectFactory.verifyProject(1, true);
    
    // Get the project and check its status
    const project = await projectFactory.getProject(1);
    expect(project.status).to.equal(1); // Approved status
    expect(project.isVerified).to.be.true;
  });

  it("Should get projects by farmer", async function () {
    // Create multiple projects as farmer
    const farmerProjectFactory = projectFactory.connect(farmer);
    
    // Create first project
    await farmerProjectFactory.createProject(
      "Project 1",
      "Description 1",
      "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      ethers.utils.parseEther("5"),
      60
    );
    
    // Create second project
    await farmerProjectFactory.createProject(
      "Project 2",
      "Description 2",
      "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      ethers.utils.parseEther("10"),
      90
    );
    
    // Get projects by farmer
    const projectIds = await projectFactory.getProjectsByFarmer(farmer.address);
    
    // Verify the number of projects and their IDs
    expect(projectIds.length).to.equal(2);
    expect(projectIds[0]).to.equal(1);
    expect(projectIds[1]).to.equal(2);
  });

  it("Should prevent non-validators from verifying projects", async function () {
    // Create a project as farmer
    const farmerProjectFactory = projectFactory.connect(farmer);
    await farmerProjectFactory.createProject(
      "Test Project",
      "Test Description",
      "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      ethers.utils.parseEther("10"),
      90
    );
    
    // Try to verify as non-validator (investor)
    await expect(
      projectFactory.connect(investor).verifyProject(1, true)
    ).to.be.revertedWith(/AccessControl/);
  });
});
