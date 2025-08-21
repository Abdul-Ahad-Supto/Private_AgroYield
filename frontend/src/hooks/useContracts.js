// frontend/src/hooks/useContracts.js - FIXED VERSION WITH PRECISION-SAFE FUND CLAIMING
import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { useToast } from '@chakra-ui/react';
import { useWeb3 } from '../contexts/Web3Context';

// Contract ABIs
import ProjectFactoryABI from '../contracts/ProjectFactory.json';
import InvestmentManagerABI from '../contracts/InvestmentManager.json';

// Contract addresses
const CONTRACT_ADDRESSES = {
  projectFactory: process.env.REACT_APP_PROJECT_FACTORY,
  investmentManager: process.env.REACT_APP_INVESTMENT_MANAGER,
  usdc: process.env.REACT_APP_USDC_ADDRESS
};

// ==========================================
// PRECISION-SAFE UTILITIES
// ==========================================

/**
 * Check if project is completed with tolerance for rounding errors
 * @param {string|number} currentAmount - Current funding amount
 * @param {string|number} targetAmount - Target funding amount
 * @param {number} toleranceUSDC - Tolerance in USDC (default 0.01 USDC)
 * @returns {boolean} - Whether project is effectively completed
 */
const isProjectPrecisionComplete = (currentAmount, targetAmount, toleranceUSDC = 0.01) => {
  const current = parseFloat(currentAmount || '0');
  const target = parseFloat(targetAmount || '0');
  
  if (target === 0) return false;
  
  const difference = target - current;
  const isComplete = difference <= toleranceUSDC;
  
  console.log('🔍 Precision Check:', {
    current: current.toFixed(6),
    target: target.toFixed(6),
    difference: difference.toFixed(6),
    toleranceUSDC,
    isComplete
  });
  
  return isComplete;
};

export const useContracts = () => {
  const { provider, signer, account, isConnected } = useWeb3();
  const [contracts, setContracts] = useState({});
  const [contractsReady, setContractsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  
  // Refs to prevent multiple initializations
  const initializingRef = useRef(false);
  const lastProviderRef = useRef(null);
  const lastSignerRef = useRef(null);

  // Contract initialization
  useEffect(() => {
    if (initializingRef.current) {
      console.log('⏭️ Skipping contract init - already initializing');
      return;
    }

    if (lastProviderRef.current === provider && lastSignerRef.current === signer) {
      console.log('⏭️ Skipping contract init - same provider/signer');
      return;
    }

    if (provider && signer && CONTRACT_ADDRESSES.projectFactory) {
      initializingRef.current = true;
      setContractsReady(false);
      
      try {
        console.log('🔧 Initializing contracts...');
        
        const projectFactory = new ethers.Contract(
          CONTRACT_ADDRESSES.projectFactory,
          ProjectFactoryABI,
          signer
        );

        const investmentManager = new ethers.Contract(
          CONTRACT_ADDRESSES.investmentManager,
          InvestmentManagerABI,
          signer
        );

        const usdc = new ethers.Contract(
          CONTRACT_ADDRESSES.usdc,
          [
            'function balanceOf(address) view returns (uint256)',
            'function transfer(address, uint256) returns (bool)',
            'function transferFrom(address, address, uint256) returns (bool)',
            'function approve(address, uint256) returns (bool)',
            'function allowance(address, address) view returns (uint256)',
            'function decimals() view returns (uint8)'
          ],
          signer
        );

        const newContracts = {
          projectFactory,
          investmentManager,
          usdc
        };

        setContracts(newContracts);
        lastProviderRef.current = provider;
        lastSignerRef.current = signer;

        setTimeout(() => {
          setContractsReady(true);
          console.log('✅ Contracts initialized and ready');
        }, 100);
        
      } catch (error) {
        console.error('❌ Error initializing contracts:', error);
        setContractsReady(false);
        toast({
          title: 'Contract Initialization Failed',
          description: 'Please check your network connection and try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        initializingRef.current = false;
      }
    } else {
      setContracts({});
      setContractsReady(false);
      lastProviderRef.current = null;
      lastSignerRef.current = null;
    }
  }, [provider, signer, toast]);

  // User Registration
  const registerUser = useCallback(async (name, profileIPFSHash = '') => {
    if (!contractsReady || !contracts.projectFactory || !isConnected) {
      throw new Error('Wallet not connected or contracts not ready');
    }

    try {
      setLoading(true);
      
      const tx = await contracts.projectFactory.registerUser(name, profileIPFSHash);
      const receipt = await tx.wait();
      
      toast({
        title: 'Registration Successful',
        description: `Welcome to AgroYield, ${name}!`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      return { tx, receipt };
      
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.reason || error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [contractsReady, contracts.projectFactory, isConnected, toast]);

  const isUserRegistered = useCallback(async (address = account) => {
    if (!contractsReady || !contracts.projectFactory || !address) {
      console.log('Contracts not ready for registration check');
      return false;
    }
    
    try {
      return await contracts.projectFactory.isUserRegistered(address);
    } catch (error) {
      console.error('Error checking registration:', error);
      return false;
    }
  }, [contractsReady, contracts.projectFactory, account]);

  const getUserProfile = useCallback(async (address = account) => {
    if (!contractsReady || !contracts.projectFactory || !address) {
      return null;
    }
    
    try {
      const profile = await contracts.projectFactory.getUserProfile(address);
      return {
        isRegistered: profile.isRegistered,
        name: profile.name,
        profileIPFSHash: profile.profileIPFSHash,
        registeredAt: profile.registeredAt.toString(),
        projectCount: profile.projectCount.toString(),
        totalInvested: profile.totalInvested.toString(),
        totalRaised: profile.totalRaised.toString()
      };
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }, [contractsReady, contracts.projectFactory, account]);

  // Create Project
  const createProject = useCallback(async (projectData) => {
    if (!contractsReady || !contracts.projectFactory || !isConnected) {
      throw new Error('Wallet not connected or contracts not ready');
    }

    try {
      setLoading(true);
      
      const {
        title,
        description,
        imageIPFSHash,
        documentsIPFSHash = '',
        targetAmountUSDC,
        durationDays,
        location,
        category
      } = projectData;

      // Convert USDC amount to proper format (6 decimals)
      const targetAmount = ethers.utils.parseUnits(targetAmountUSDC.toString(), 6);
      
      const tx = await contracts.projectFactory.createProject(
        title,
        description,
        imageIPFSHash,
        documentsIPFSHash,
        targetAmount,
        parseInt(durationDays),
        location,
        category
      );
      
      const receipt = await tx.wait();
      
      // Get project ID from event
      const event = receipt.events?.find(e => e.event === 'ProjectCreated');
      const projectId = event?.args?.projectId?.toString();
      
      // Clear cache since we added a new project
      clearProjectCache();
      
      toast({
        title: 'Project Created Successfully',
        description: `Project ID: ${projectId}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      return { tx, receipt, projectId };
      
    } catch (error) {
      console.error('Create project error:', error);
      toast({
        title: 'Project Creation Failed',
        description: error.reason || error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [contractsReady, contracts.projectFactory, isConnected, toast]);

  // Cached functions
  const projectsCacheRef = useRef(null);
  const lastFetchTimeRef = useRef(0);
  const CACHE_DURATION = 30000; // 30 seconds cache

  const getAllProjects = useCallback(async () => {
    if (!contractsReady || !contracts.projectFactory) {
      console.log('⏳ Contracts not ready for getAllProjects');
      return [];
    }
    
    // Use cache if recent
    const now = Date.now();
    if (projectsCacheRef.current && (now - lastFetchTimeRef.current) < CACHE_DURATION) {
      console.log('📋 Using cached projects data');
      return projectsCacheRef.current;
    }
    
    try {
      console.log('🔍 Fetching fresh projects from blockchain...');
      const projects = await contracts.projectFactory.getAllProjects();
      
      const processedProjects = projects.map(project => ({
        id: project.id.toString(),
        farmer: project.farmer,
        title: project.title,
        description: project.description,
        imageIPFSHash: project.imageIPFSHash,
        documentsIPFSHash: project.documentsIPFSHash,
        targetAmountUSDC: ethers.utils.formatUnits(project.targetAmountUSDC, 6),
        currentAmountUSDC: ethers.utils.formatUnits(project.currentAmountUSDC, 6),
        durationDays: project.durationDays.toString(),
        createdAt: project.createdAt.toString(),
        deadline: project.deadline.toString(),
        status: project.status,
        location: project.location,
        category: project.category,
        investorCount: project.investorCount.toString(),
        fundsReleased: project.fundsReleased,
        fundsReleasedAt: project.fundsReleasedAt ? project.fundsReleasedAt.toString() : '0'
      }));

      // Cache the results
      projectsCacheRef.current = processedProjects;
      lastFetchTimeRef.current = now;
      
      console.log('✅ Projects loaded and cached:', processedProjects.length);
      return processedProjects;
      
    } catch (error) {
      console.error('❌ Error getting projects:', error);
      return projectsCacheRef.current || [];
    }
  }, [contractsReady, contracts.projectFactory]);

  // Single project fetch
  const projectCacheRef = useRef(new Map());

  const getProject = useCallback(async (projectId) => {
    if (!contractsReady || !contracts.projectFactory || !projectId) {
      console.log('⏳ Contracts not ready or no project ID provided');
      return null;
    }
    
    // Check cache first
    const cacheKey = `project_${projectId}`;
    if (projectCacheRef.current.has(cacheKey)) {
      const cached = projectCacheRef.current.get(cacheKey);
      // Use cache if less than 60 seconds old
      if (Date.now() - cached.timestamp < 60000) {
        console.log('📋 Using cached project data for ID:', projectId);
        return cached.data;
      }
    }
    
    try {
      console.log('🔍 Fetching project from blockchain:', projectId);
      const project = await contracts.projectFactory.getProject(projectId);
      
      if (!project || project.id.toString() === '0') {
        console.warn('❌ Project not found:', projectId);
        return null;
      }
      
      const processedProject = {
        id: project.id.toString(),
        farmer: project.farmer,
        title: project.title,
        description: project.description,
        imageIPFSHash: project.imageIPFSHash,
        documentsIPFSHash: project.documentsIPFSHash,
        targetAmountUSDC: ethers.utils.formatUnits(project.targetAmountUSDC, 6),
        currentAmountUSDC: ethers.utils.formatUnits(project.currentAmountUSDC, 6),
        durationDays: project.durationDays.toString(),
        createdAt: project.createdAt.toString(),
        deadline: project.deadline.toString(),
        status: project.status,
        location: project.location,
        category: project.category,
        investorCount: project.investorCount.toString(),
        fundsReleased: project.fundsReleased,
        fundsReleasedAt: project.fundsReleasedAt ? project.fundsReleasedAt.toString() : '0'
      };

      // Cache the result
      projectCacheRef.current.set(cacheKey, {
        data: processedProject,
        timestamp: Date.now()
      });
      
      console.log('✅ Project loaded and cached:', processedProject.id);
      return processedProject;
      
    } catch (error) {
      console.error('❌ Error getting project:', error);
      return null;
    }
  }, [contractsReady, contracts.projectFactory]);

  // Clear project cache when needed
  const clearProjectCache = useCallback((projectId) => {
    if (projectId) {
      projectCacheRef.current.delete(`project_${projectId}`);
    } else {
      projectCacheRef.current.clear();
      projectsCacheRef.current = null;
    }
  }, []);

  // Investment with flexible minimums
  const investInProject = useCallback(async (projectId, amountUSDC) => {
    if (!contractsReady || !contracts.investmentManager || !contracts.usdc || !isConnected) {
      throw new Error('Wallet not connected or contracts not ready');
    }

    try {
      setLoading(true);
      
      const amount = ethers.utils.parseUnits(amountUSDC.toString(), 6);
      
      // Check USDC balance
      const balance = await contracts.usdc.balanceOf(account);
      if (balance.lt(amount)) {
        throw new Error('Insufficient USDC balance');
      }
      
      // Check allowance
      const allowance = await contracts.usdc.allowance(account, CONTRACT_ADDRESSES.investmentManager);
      if (allowance.lt(amount)) {
        // Approve USDC spending
        const approveTx = await contracts.usdc.approve(CONTRACT_ADDRESSES.investmentManager, amount);
        await approveTx.wait();
        
        toast({
          title: 'USDC Approved',
          description: 'USDC spending approved for investment',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }
      
      // Make investment
      const tx = await contracts.investmentManager.investInProject(projectId, amount);
      const receipt = await tx.wait();
      
      // Clear cache for this project since it was updated
      clearProjectCache(projectId);
      
      toast({
        title: 'Investment Successful',
        description: `Invested ${amountUSDC} USDC in project ${projectId}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      return { tx, receipt };
      
    } catch (error) {
      console.error('Investment error:', error);
      toast({
        title: 'Investment Failed',
        description: error.reason || error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [contractsReady, contracts.investmentManager, contracts.usdc, isConnected, account, toast, clearProjectCache]);

  // FIXED: Precision-safe fund claiming check
  const canClaimFunds = useCallback(async (projectId) => {
    if (!contractsReady || !contracts.projectFactory || !projectId) {
      return false;
    }
    
    try {
      // First try the smart contract function
      let canClaim = false;
      try {
        canClaim = await contracts.projectFactory.canClaimFunds(projectId);
        console.log('🏦 Smart contract canClaimFunds result:', canClaim);
      } catch (error) {
        console.log('Smart contract canClaimFunds failed:', error.message);
      }
      
      // If smart contract says no, check using precision-safe calculation
      if (!canClaim) {
        const project = await contracts.projectFactory.getProject(projectId);
        if (project && project.id !== '0') {
          // Use precision-safe completion check with 0.01 USDC tolerance
          const isNearlyComplete = isProjectPrecisionComplete(
            project.currentAmountUSDC, 
            project.targetAmountUSDC,
            0.01 // 0.01 USDC tolerance for rounding errors
          );
          const isNotReleased = !project.fundsReleased;
          
          canClaim = isNearlyComplete && isNotReleased;
          
          if (canClaim) {
            console.log('✅ Precision-safe check allows fund claiming:', {
              projectId,
              currentAmount: project.currentAmountUSDC,
              targetAmount: project.targetAmountUSDC,
              difference: (parseFloat(project.targetAmountUSDC) - parseFloat(project.currentAmountUSDC)).toFixed(6),
              fundsReleased: project.fundsReleased
            });
          }
        }
      }
      
      return canClaim;
    } catch (error) {
      console.error('Error checking fund claim eligibility:', error);
      return false;
    }
  }, [contractsReady, contracts.projectFactory]);

  const claimProjectFunds = useCallback(async (projectId) => {
    if (!contractsReady || !contracts.projectFactory || !isConnected) {
      throw new Error('Wallet not connected or contracts not ready');
    }

    try {
      setLoading(true);
      
      console.log('🔍 useContracts.claimProjectFunds called:', {
        projectId,
        contractsReady,
        hasProjectFactory: !!contracts.projectFactory,
        isConnected,
        account
      });
      
      // Use our precision-safe check
      console.log('🔍 Checking canClaimFunds...');
      const canClaim = await canClaimFunds(projectId);
      console.log('🔍 canClaimFunds result:', canClaim);
      
      if (!canClaim) {
        throw new Error('Funds cannot be claimed yet. Project may not be completed or funds already released.');
      }
      
      console.log('🔍 Calling contracts.projectFactory.claimProjectFunds...');
      const tx = await contracts.projectFactory.claimProjectFunds(projectId);
      console.log('🔍 Transaction sent:', tx.hash);
      
      console.log('🔍 Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt);
      
      // Clear cache for this project since it was updated
      clearProjectCache(projectId);
      
      toast({
        title: 'Funds Claimed Successfully',
        description: `Project funds have been transferred to your wallet`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      return { tx, receipt };
      
    } catch (error) {
      console.error('❌ useContracts.claimProjectFunds error:', {
        error,
        message: error.message,
        reason: error.reason,
        code: error.code
      });
      
      toast({
        title: 'Fund Claim Failed',
        description: error.reason || error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [contractsReady, contracts.projectFactory, isConnected, toast, clearProjectCache, canClaimFunds]);

  // Get investment constraints
  const getInvestmentConstraints = useCallback(async (projectId) => {
    if (!contractsReady || !contracts.investmentManager || !projectId) {
      return null;
    }
    
    try {
      const constraints = await contracts.investmentManager.getInvestmentConstraints(projectId);
      return {
        minInvestment: ethers.utils.formatUnits(constraints.minInvestment, 6),
        maxInvestment: ethers.utils.formatUnits(constraints.maxInvestment, 6),
        remainingAmount: ethers.utils.formatUnits(constraints.remainingAmount, 6),
        canCompleteFunding: constraints.canCompleteFunding
      };
    } catch (error) {
      console.error('Error getting investment constraints:', error);
      return null;
    }
  }, [contractsReady, contracts.investmentManager]);

  const getUSDCBalance = useCallback(async (address = account) => {
    if (!contractsReady || !contracts.usdc || !address) return '0';
    
    try {
      const balance = await contracts.usdc.balanceOf(address);
      return ethers.utils.formatUnits(balance, 6);
    } catch (error) {
      console.error('Error getting USDC balance:', error);
      return '0';
    }
  }, [contractsReady, contracts.usdc, account]);

  const getPlatformStats = useCallback(async () => {
    if (!contractsReady || !contracts.projectFactory) return null;
    
    try {
      const stats = await contracts.projectFactory.getPlatformStats();
      
      return {
        totalProjects: stats.totalProjects.toString(),
        totalUsers: stats.totalUsers.toString(),
        totalInvestments: stats.totalInvestments.toString(),
        totalFunding: ethers.utils.formatUnits(stats.totalFunding, 6)
      };
      
    } catch (error) {
      console.error('Error getting platform stats:', error);
      return null;
    }
  }, [contractsReady, contracts.projectFactory]);

  const getInvestorData = useCallback(async (address = account) => {
    if (!contractsReady || !contracts.investmentManager || !address) return null;
    
    try {
      const data = await contracts.investmentManager.getInvestorData(address);
      
      return {
        totalInvested: ethers.utils.formatUnits(data.totalInvested, 6),
        activeInvestments: data.activeInvestments.toString(),
        claimedReturns: ethers.utils.formatUnits(data.claimedReturns, 6),
        pendingAmount: ethers.utils.formatUnits(data.pendingAmount, 6),
        projectIds: data.projectIds.map(id => id.toString())
      };
      
    } catch (error) {
      console.error('Error getting investor data:', error);
      return null;
    }
  }, [contractsReady, contracts.investmentManager, account]);

  // Cleanup cache on unmount
  useEffect(() => {
    return () => {
      projectCacheRef.current.clear();
      projectsCacheRef.current = null;
    };
  }, []);

  return {
    contracts,
    contractsReady,
    loading,
    
    // User functions
    registerUser,
    isUserRegistered,
    getUserProfile,
    
    // Project functions
    createProject,
    getAllProjects,
    getProject,
    clearProjectCache,
    
    // Investment functions
    investInProject,
    getUSDCBalance,
    getInvestorData,
    getInvestmentConstraints,
    
    // FIXED: Precision-safe fund release functions
    claimProjectFunds,
    canClaimFunds,
    
    // Platform functions
    getPlatformStats,
    
    // Contract addresses for reference
    addresses: CONTRACT_ADDRESSES,
    
    // Utility functions
    isProjectPrecisionComplete
  };
};