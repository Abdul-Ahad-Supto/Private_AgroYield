// frontend/src/pages/ProjectDetail.js - PRECISION-SAFE VERSION
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  Button, 
  Stack, 
  SimpleGrid, 
  Divider, 
  Badge,
  Progress,
  VStack,
  HStack,
  useColorModeValue,
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  Card,
  CardBody,
  Avatar,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Center
} from '@chakra-ui/react';
import { 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaMoneyBillWave, 
  FaClock, 
  FaUsers, 
  FaArrowLeft,
  FaUser,
  FaCheckCircle,
  FaHandHoldingUsd
} from 'react-icons/fa';
import { useWeb3 } from '../contexts/Web3Context';
import { useContracts } from '../hooks/useContracts';
import CORSSafeImage from '../components/CORSSafeImage';
import FundClaimModal from '../components/FundClaimModal';

// ==========================================
// PRECISION-SAFE CALCULATION UTILITIES
// ==========================================

/**
 * Converts a number to its integer representation for precise calculations
 * @param {number|string} num - Number to convert
 * @param {number} decimals - Number of decimal places
 * @returns {number} - Integer representation
 */
const toSafeInteger = (num, decimals = 6) => {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  return Math.round(numValue * Math.pow(10, decimals));
};

/**
 * Converts integer back to decimal with specified precision
 * @param {number} safeInt - Integer representation
 * @param {number} decimals - Number of decimal places
 * @returns {number} - Decimal value
 */
const fromSafeInteger = (safeInt, decimals = 6) => {
  return safeInt / Math.pow(10, decimals);
};

/**
 * Calculate funding percentage with precision safety
 * @param {string|number} currentAmount - Current funding amount
 * @param {string|number} targetAmount - Target funding amount
 * @returns {number} - Precise percentage (0-100)
 */
const calculatePreciseFundingProgress = (currentAmount, targetAmount) => {
  // Convert to safe integers (using 6 decimal places for USDC)
  const currentInt = toSafeInteger(currentAmount, 6);
  const targetInt = toSafeInteger(targetAmount, 6);
  
  if (targetInt === 0) return 0;
  
  // Calculate percentage using integers, then scale back
  const percentageInt = Math.round((currentInt * 10000) / targetInt); // 10000 for 2 decimal precision in percentage
  const percentage = percentageInt / 100; // Convert back to percentage
  
  return Math.min(percentage, 100); // Cap at 100%
};

/**
 * Check if project is completed with tolerance for rounding errors
 * @param {string|number} currentAmount - Current funding amount
 * @param {string|number} targetAmount - Target funding amount
 * @param {number} tolerance - Tolerance percentage (default 0.01% = 0.0001)
 * @returns {boolean} - Whether project is effectively completed
 */
const isProjectCompleted = (currentAmount, targetAmount, tolerance = 0.0001) => {
  const currentInt = toSafeInteger(currentAmount, 6);
  const targetInt = toSafeInteger(targetAmount, 6);
  
  if (targetInt === 0) return false;
  
  // Calculate the difference in "safe integer" space
  const difference = targetInt - currentInt;
  const toleranceInt = Math.round(targetInt * tolerance);
  
  console.log('🔍 Completion Check (Precision-Safe):', {
    currentAmount: currentAmount,
    targetAmount: targetAmount,
    currentInt,
    targetInt,
    difference,
    toleranceInt,
    isCompleted: difference <= toleranceInt,
    percentage: calculatePreciseFundingProgress(currentAmount, targetAmount)
  });
  
  // Project is completed if the difference is within tolerance
  return difference <= toleranceInt;
};

/**
 * Format number for display with consistent precision
 * @param {string|number} num - Number to format
 * @param {number} decimals - Decimal places
 * @returns {string} - Formatted number
 */
const formatNumber = (num, decimals = 2) => {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  return numValue.toFixed(decimals);
};

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isClaimOpen, onOpen: onClaimOpen, onClose: onClaimClose } = useDisclosure();
  
  // Web3 and contract hooks
  const { isConnected, account } = useWeb3();
  const { 
    getProject, 
    investInProject, 
    getUSDCBalance, 
    contractsReady, 
    getInvestmentConstraints,
    canClaimFunds 
  } = useContracts();
  
  // Component state
  const [project, setProject] = useState(null);
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [investmentConstraints, setInvestmentConstraints] = useState(null);
  const [canClaimProjectFunds, setCanClaimProjectFunds] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isInvesting, setIsInvesting] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  
  // Prevent multiple fetches
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastFetchedIdRef = useRef(null);
  
  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.300');

  // Stable project fetch function
  const fetchProjectData = useCallback(async (projectId) => {
    if (fetchingRef.current || !projectId || !getProject) {
      console.log('⏭️ Skipping project fetch - already fetching or not ready');
      return;
    }

    if (lastFetchedIdRef.current === projectId && project) {
      console.log('⏭️ Project already loaded:', projectId);
      setIsLoading(false);
      return;
    }

    fetchingRef.current = true;
    setFetchError(null);
    
    try {
      console.log('🔍 Fetching project:', projectId);
      
      const projectData = await getProject(projectId);
      
      if (!mountedRef.current) return;
      
      if (!projectData || projectData.id === '0' || projectData.id === 0) {
        console.error('❌ Project not found:', projectId);
        setFetchError('Project not found - invalid project ID');
        return;
      }
      
      console.log('✅ Project data loaded:', projectData);
      setProject(projectData);
      setFetchError(null);
      lastFetchedIdRef.current = projectId;
      
    } catch (error) {
      console.error('❌ Error fetching project:', error);
      if (mountedRef.current) {
        setFetchError(`Failed to load project: ${error.message}`);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [getProject, project]);

  // ✅ FIXED: Precision-safe project metrics calculation
  const projectMetrics = useMemo(() => {
    if (!project) return null;

    // Use precision-safe calculations
    const fundingProgress = calculatePreciseFundingProgress(
      project.currentAmountUSDC, 
      project.targetAmountUSDC
    );

    const daysLeft = project.deadline ? 
      Math.max(0, Math.floor((new Date(parseInt(project.deadline) * 1000) - new Date()) / (1000 * 60 * 60 * 24))) 
      : 'N/A';

    // ✅ FIXED: Use precision-safe completion check
    const isCompleted = isProjectCompleted(
      project.currentAmountUSDC, 
      project.targetAmountUSDC,
      0.001 // 0.1% tolerance for rounding errors
    );
    
    const currentAmount = parseFloat(project.currentAmountUSDC || '0');
    const targetAmount = parseFloat(project.targetAmountUSDC || '0');
    
    const isFarmer = account && project.farmer && 
      account.toLowerCase() === project.farmer.toLowerCase();

    console.log('🔍 ProjectMetrics (Precision-Safe):', {
      currentAmountUSDC: project.currentAmountUSDC,
      targetAmountUSDC: project.targetAmountUSDC,
      fundingProgress,
      isCompleted,
      isFarmer,
      precisionCheck: {
        current: currentAmount,
        target: targetAmount,
        difference: targetAmount - currentAmount,
        differenceUSDC: (targetAmount - currentAmount).toFixed(6)
      }
    });

    return {
      fundingProgress,
      daysLeft,
      currentAmount,
      targetAmount,
      investorCount: project.investorCount || '0',
      isCompleted,
      isFarmer
    };
  }, [project, account]);

  // Fetch additional data - UPDATED with precision-safe claim check
  const fetchAdditionalData = useCallback(async () => {
    if (!isConnected || !account || !contractsReady || !id) return;
    
    try {
      // Fetch USDC balance
      if (getUSDCBalance) {
        const balance = await getUSDCBalance(account);
        if (mountedRef.current) {
          setUsdcBalance(balance);
        }
      }
      
      // Fetch investment constraints
      if (getInvestmentConstraints) {
        const constraints = await getInvestmentConstraints(id);
        if (mountedRef.current) {
          setInvestmentConstraints(constraints);
        }
      }
      
      // ✅ FIXED: Use precision-safe completion check for farmer claim eligibility
      if (project && project.farmer === account) {
        let canClaim = false;
        
        // First check smart contract
        if (canClaimFunds) {
          try {
            canClaim = await canClaimFunds(id);
          } catch (error) {
            console.log('Smart contract canClaimFunds failed:', error);
          }
        }
        
        // ✅ If smart contract says no, check using precision-safe calculation
        if (!canClaim && projectMetrics) {
          const isNearlyComplete = isProjectCompleted(
            project.currentAmountUSDC, 
            project.targetAmountUSDC,
            0.001 // 0.1% tolerance
          );
          const isNotReleased = !project.fundsReleased;
          canClaim = isNearlyComplete && isNotReleased;
          
          if (canClaim) {
            console.log('✅ Allowing claim due to precision-safe completion check', {
              currentAmount: project.currentAmountUSDC,
              targetAmount: project.targetAmountUSDC,
              fundingProgress: projectMetrics.fundingProgress,
              fundsReleased: project.fundsReleased
            });
          }
        }
        
        if (mountedRef.current) {
          setCanClaimProjectFunds(canClaim);
        }
      }
      
    } catch (error) {
      console.error('Error fetching additional data:', error);
    }
  }, [isConnected, account, contractsReady, id, getUSDCBalance, getInvestmentConstraints, canClaimFunds, project, projectMetrics]);

  // Effects
  useEffect(() => {
    mountedRef.current = true;
    
    if (id && contractsReady && getProject) {
      setIsLoading(true);
      fetchProjectData(id);
    } else if (!id) {
      setFetchError('No project ID provided');
      setIsLoading(false);
    } else if (!contractsReady) {
      console.log('⏳ Waiting for contracts to be ready...');
    }

    return () => {
      mountedRef.current = false;
      fetchingRef.current = false;
    };
  }, [id, contractsReady, fetchProjectData]);

  useEffect(() => {
    if (project && isConnected && account && contractsReady) {
      fetchAdditionalData();
    }
  }, [project, isConnected, account, contractsReady, fetchAdditionalData]);

  // Investment handler
  const handleInvest = useCallback(async () => {
    if (!isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to invest.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (!investmentAmount || parseFloat(investmentAmount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid investment amount.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    // Check against dynamic minimum
    const minRequired = investmentConstraints?.minInvestment ? parseFloat(investmentConstraints.minInvestment) : 10;
    if (parseFloat(investmentAmount) < minRequired) {
      toast({
        title: 'Below Minimum Investment',
        description: `Minimum investment amount is ${minRequired.toFixed(2)} USDC.`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (parseFloat(investmentAmount) > parseFloat(usdcBalance)) {
      toast({
        title: 'Insufficient Balance',
        description: 'You do not have enough USDC balance.',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    setIsInvesting(true);
    try {
      await investInProject(id, investmentAmount);
      
      // Refresh project data after successful investment
      await fetchProjectData(id);
      await fetchAdditionalData();
      
      // Close modal and reset amount
      onClose();
      setInvestmentAmount('');
      
    } catch (error) {
      console.error('Investment failed:', error);
    } finally {
      setIsInvesting(false);
    }
  }, [
    isConnected, 
    investmentAmount, 
    usdcBalance, 
    investmentConstraints,
    id, 
    investInProject, 
    fetchProjectData, 
    fetchAdditionalData,
    onClose, 
    toast
  ]);

  // Handle fund claim success
  const handleClaimSuccess = useCallback(async () => {
    // Refresh project data
    await fetchProjectData(id);
    await fetchAdditionalData();
  }, [fetchProjectData, fetchAdditionalData, id]);

  // ✅ FIXED: Get project status with precision-safe calculations
  const getProjectStatus = useMemo(() => {
    if (!project) return { text: 'Loading...', color: 'gray' };
    if (!projectMetrics) return { text: 'Loading...', color: 'gray' };
    
    // Check funds released first
    if (project.fundsReleased || project.status === 3) {
      return { text: 'Funds Released', color: 'purple' };
    }
    
    // Map the actual blockchain status values
    switch (Number(project.status)) {
      case 0: // Active
        if (projectMetrics.isCompleted) {
          return { text: 'Fully Funded', color: 'green' };
        }
        return { text: 'Active', color: 'blue' };
      
      case 1: // Completed
        return { text: 'Completed', color: 'green' };
      
      case 2: // Cancelled
        return { text: 'Cancelled', color: 'red' };
      
      case 3: // FundsReleased
        return { text: 'Funds Released', color: 'purple' };
      
      default:
        console.log('Unknown project status:', project.status, typeof project.status);
        return { text: 'Unknown', color: 'gray' };
    }
  }, [project, projectMetrics]);

  // Loading state
  if (isLoading) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack spacing={8} align="center" py={20}>
          <Spinner size="xl" color="brand.500" thickness="4px" />
          <Text>Loading project details...</Text>
          <Text fontSize="sm" color="gray.500">Project ID: {id}</Text>
        </VStack>
      </Container>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <Container maxW="7xl" py={8}>
        <VStack spacing={6} py={20}>
          <Alert status="error" borderRadius="lg" maxW="md">
            <AlertIcon />
            <Box>
              <AlertTitle>Project Not Found!</AlertTitle>
              <AlertDescription>
                {fetchError}
              </AlertDescription>
            </Box>
          </Alert>
          
          <VStack spacing={2}>
            <Text fontSize="sm" color="gray.500">Project ID: {id}</Text>
            <Text fontSize="sm" color="gray.500">
              The project might not exist or there might be a network issue.
            </Text>
          </VStack>
          
          <HStack spacing={4}>
            <Button 
              leftIcon={<FaArrowLeft />} 
              onClick={() => navigate('/projects')}
              colorScheme="brand"
            >
              Back to Projects
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                setFetchError(null);
                setIsLoading(true);
                fetchProjectData(id);
              }}
            >
              Retry
            </Button>
          </HStack>
        </VStack>
      </Container>
    );
  }

  // No project data
  if (!project) {
    return (
      <Container maxW="7xl" py={8}>
        <Center py={20}>
          <VStack spacing={4}>
            <Text fontSize="xl">No project data available</Text>
            <Button onClick={() => navigate('/projects')} colorScheme="brand">
              Back to Projects
            </Button>
          </VStack>
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="7xl" py={8}>
      <Stack spacing={8}>
        {/* Back Button */}
        <Button 
          leftIcon={<FaArrowLeft />} 
          variant="ghost" 
          size="sm" 
          alignSelf="flex-start"
          onClick={() => navigate('/projects')}
        >
          Back to Projects
        </Button>

        {/* Project Header */}
        <Box>
          <HStack spacing={3} mb={2}>
            <Badge colorScheme="green" px={3} py={1} borderRadius="full">
              {project.category}
            </Badge>
            <Badge colorScheme={getProjectStatus.color} px={3} py={1} borderRadius="full">
              {getProjectStatus.text}
            </Badge>
          </HStack>
          <Heading as="h1" size="2xl" mb={4}>
            {project.title}
          </Heading>
          <Text fontSize="lg" color={secondaryTextColor} maxW="3xl">
            {project.description}
          </Text>
        </Box>

        <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={8}>
          {/* Main Content */}
          <Box gridColumn={{ base: '1', lg: '1 / span 2' }}>
            {/* Project Image */}
            <Box 
              borderRadius="lg"
              overflow="hidden"
              mb={6}
              height={{ base: '300px', md: '400px' }}
            >
              <CORSSafeImage
                ipfsHash={project.imageIPFSHash}
                category={project.category}
                alt={project.title}
                width="100%"
                height="100%"
                objectFit="cover"
              />
            </Box>

            <Tabs variant="enclosed" colorScheme="brand">
              <TabList>
                <Tab>Project Details</Tab>
                <Tab>Farmer Info</Tab>
                {projectMetrics?.isFarmer && <Tab>Farmer Actions</Tab>}
              </TabList>

              <TabPanels py={6}>
                <TabPanel px={0}>
                  <VStack spacing={6} align="stretch">
                    <Box>
                      <Heading size="md" mb={4}>Project Description</Heading>
                      <Text>{project.description}</Text>
                    </Box>
                    
                    <Box>
                      <Heading size="md" mb={4}>Project Details</Heading>
                      <VStack align="stretch" spacing={3}>
                        <HStack justify="space-between">
                          <Text fontSize="sm" color="gray.500">Duration:</Text>
                          <Text fontSize="sm">{project.durationDays} days</Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontSize="sm" color="gray.500">Created:</Text>
                          <Text fontSize="sm">
                            {project.createdAt ? new Date(parseInt(project.createdAt) * 1000).toLocaleDateString() : 'N/A'}
                          </Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontSize="sm" color="gray.500">Deadline:</Text>
                          <Text fontSize="sm">
                            {project.deadline ? new Date(parseInt(project.deadline) * 1000).toLocaleDateString() : 'N/A'}
                          </Text>
                        </HStack>
                        <HStack justify="space-between">
                          <Text fontSize="sm" color="gray.500">Status:</Text>
                          <Badge colorScheme={getProjectStatus.color}>
                            {getProjectStatus.text}
                          </Badge>
                        </HStack>
                        {project.fundsReleased && project.fundsReleasedAt !== '0' && (
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.500">Funds Released:</Text>
                            <Text fontSize="sm">
                              {new Date(parseInt(project.fundsReleasedAt) * 1000).toLocaleDateString()}
                            </Text>
                          </HStack>
                        )}
                      </VStack>
                    </Box>
                  </VStack>
                </TabPanel>
                
                <TabPanel px={0}>
                  <VStack spacing={4} align="stretch">
                    <Card>
                      <CardBody>
                        <HStack spacing={4} mb={4}>
                          <Avatar
                            size="lg"
                            name="Project Farmer"
                          />
                          <Box>
                            <Text fontWeight="bold" fontSize="lg">Project Farmer</Text>
                            <Text fontSize="sm" color="gray.500" fontFamily="mono">
                              {project.farmer}
                            </Text>
                            <Badge colorScheme="green" mt={1}>Verified Farmer</Badge>
                            {projectMetrics?.isFarmer && (
                              <Badge colorScheme="blue" mt={1} ml={2}>You</Badge>
                            )}
                          </Box>
                        </HStack>
                        <Text mb={4} color={textColor}>
                          Registered farmer on the AgroYield platform.
                        </Text>
                        <VStack align="stretch" spacing={2}>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.500">Location:</Text>
                            <Text fontSize="sm">{project.location}</Text>
                          </HStack>
                          <HStack justify="space-between">
                            <Text fontSize="sm" color="gray.500">Category:</Text>
                            <Text fontSize="sm">{project.category}</Text>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  </VStack>
                </TabPanel>

                {/* ✅ FIXED: Farmer Actions Tab with precision-safe claim button */}
                {projectMetrics?.isFarmer && (
                  <TabPanel px={0}>
                    <VStack spacing={6} align="stretch">
                      <Box>
                        <Heading size="md" mb={4}>Farmer Dashboard</Heading>
                        <Text color={textColor} mb={4}>
                          Manage your project and claim funds when ready.
                        </Text>
                      </Box>

                      {/* Fund Claim Section */}
                      <Card>
                        <CardBody>
                          <VStack spacing={4} align="stretch">
                            <HStack justify="space-between">
                              <HStack spacing={3}>
                                <FaHandHoldingUsd color="#38A169" size={24} />
                                <Box>
                                  <Text fontWeight="bold">Project Funds</Text>
                                  <Text fontSize="sm" color="gray.500">
                                    Claim your raised funding
                                  </Text>
                                </Box>
                              </HStack>
                              
                              {projectMetrics.isCompleted ? (
                                project.fundsReleased ? (
                                  <Badge colorScheme="purple" p={2}>
                                    ✓ Funds Claimed
                                  </Badge>
                                ) : (
                                  <Badge colorScheme="green" p={2}>
                                    Ready to Claim
                                  </Badge>
                                )
                              ) : (
                                <Badge colorScheme="gray" p={2}>
                                  Funding in Progress
                                </Badge>
                              )}
                            </HStack>

                            <Divider />

                            <HStack justify="space-between">
                              <Text fontSize="sm" color="gray.500">Available to Claim:</Text>
                              <Text fontWeight="bold" fontSize="lg" color="green.500">
                                {formatNumber(projectMetrics.currentAmount, 2)} USDC
                              </Text>
                            </HStack>

                            {/* ✅ FIXED: Precision-safe claim button condition */}
                            {projectMetrics.isCompleted && !project.fundsReleased ? (
                              <Button
                                colorScheme="green"
                                leftIcon={<FaCheckCircle />}
                                onClick={onClaimOpen}
                                size="lg"
                                width="100%"
                              >
                                Claim Project Funds
                              </Button>
                            ) : project.fundsReleased ? (
                              <Alert status="success" borderRadius="md">
                                <AlertIcon />
                                <Box>
                                  <AlertTitle fontSize="sm">Funds Claimed!</AlertTitle>
                                  <AlertDescription fontSize="sm">
                                    Project funds have been successfully transferred to your wallet.
                                  </AlertDescription>
                                </Box>
                              </Alert>
                            ) : (
                              <Alert status="info" borderRadius="md">
                                <AlertIcon />
                                <Box>
                                  <AlertTitle fontSize="sm">Funding in Progress</AlertTitle>
                                  <AlertDescription fontSize="sm">
                                    Wait for your project to be fully funded before claiming funds.
                                    Current: {formatNumber(projectMetrics.fundingProgress, 3)}%
                                    Need: {formatNumber(projectMetrics.targetAmount - projectMetrics.currentAmount, 6)} USDC more
                                  </AlertDescription>
                                </Box>
                              </Alert>
                            )}
                          </VStack>
                        </CardBody>
                      </Card>
                    </VStack>
                  </TabPanel>
                )}
              </TabPanels>
            </Tabs>
          </Box>

          {/* Sidebar */}
          <Box>
            <Box 
              bg={cardBg} 
              p={6} 
              borderRadius="lg" 
              borderWidth="1px" 
              borderColor={borderColor}
              position="sticky"
              top="6rem"
            >
              <VStack spacing={6} align="stretch">
                {projectMetrics && (
                  <>
                    <Box>
                      <Text fontSize="sm" color="gray.500" mb={1}>
                        Raised of {formatNumber(projectMetrics.targetAmount, 2)} USDC goal
                      </Text>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Text fontSize="2xl" fontWeight="bold" mr={2}>
                          {formatNumber(projectMetrics.currentAmount, 2)} USDC
                        </Text>
                        <Text color="green.500" fontWeight="medium">
                          {formatNumber(projectMetrics.fundingProgress, 2)}%
                        </Text>
                      </Box>
                      <Progress 
                        value={projectMetrics.fundingProgress} 
                        colorScheme="green" 
                        size="sm" 
                        borderRadius="full" 
                      />
                    </Box>
                    
                    <Box display="flex" justifyContent="space-between">
                      <Box textAlign="center">
                        <Text fontSize="sm" color="gray.500">Backers</Text>
                        <Text fontWeight="bold">{projectMetrics.investorCount}</Text>
                      </Box>
                      <Box textAlign="center">
                        <Text fontSize="sm" color="gray.500">Days Left</Text>
                        <Text fontWeight="bold">{projectMetrics.daysLeft}</Text>
                      </Box>
                      <Box textAlign="center">
                        <Text fontSize="sm" color="gray.500">Status</Text>
                        <Badge colorScheme={getProjectStatus.color}>
                          {getProjectStatus.text}
                        </Badge>
                      </Box>
                    </Box>
                  </>
                )}
                
                {isConnected && (
                  <Box p={3} bg="gray.50" borderRadius="md">
                    <Text fontSize="sm" color="gray.600" mb={1}>Your USDC Balance:</Text>
                    <Text fontWeight="bold">{formatNumber(parseFloat(usdcBalance), 2)} USDC</Text>
                  </Box>
                )}

                {/* Investment Constraints Info */}
                {investmentConstraints && (
                  <Box p={3} bg="blue.50" borderRadius="md">
                    <Text fontSize="sm" fontWeight="medium" color="blue.700" mb={2}>
                      Investment Requirements
                    </Text>
                    <VStack align="stretch" spacing={1}>
                      <HStack justify="space-between">
                        <Text fontSize="xs" color="blue.600">Minimum:</Text>
                        <Text fontSize="xs" fontWeight="bold" color="blue.700">
                          {formatNumber(parseFloat(investmentConstraints.minInvestment), 2)} USDC
                        </Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="xs" color="blue.600">Maximum:</Text>
                        <Text fontSize="xs" color="blue.600">
                          {formatNumber(parseFloat(investmentConstraints.maxInvestment), 2)} USDC
                        </Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="xs" color="blue.600">Remaining:</Text>
                        <Text fontSize="xs" fontWeight="bold" color="blue.700">
                          {formatNumber(parseFloat(investmentConstraints.remainingAmount), 6)} USDC
                        </Text>
                      </HStack>
                      {investmentConstraints.canCompleteFunding && (
                        <Text fontSize="xs" color="green.600" fontWeight="bold">
                          ✓ Can complete funding!
                        </Text>
                      )}
                    </VStack>
                  </Box>
                )}
                
                {/* Investment Button */}
                {projectMetrics?.isCompleted ? (
                  <Alert status="success" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <AlertTitle fontSize="sm">Project Completed!</AlertTitle>
                      <AlertDescription fontSize="sm">
                        This project has reached its funding goal.
                      </AlertDescription>
                    </Box>
                  </Alert>
                ) : projectMetrics?.isFarmer ? (
                  <Alert status="info" borderRadius="md">
                    <AlertIcon />
                    <Box>
                      <AlertTitle fontSize="sm">Your Project</AlertTitle>
                      <AlertDescription fontSize="sm">
                        This is your project. Share it with investors!
                      </AlertDescription>
                    </Box>
                  </Alert>
                ) : (
                  <Button 
                    colorScheme="brand" 
                    size="lg" 
                    width="full"
                    leftIcon={<FaMoneyBillWave />}
                    mb={2}
                    onClick={onOpen}
                    isDisabled={!isConnected || Number(project.status) !== 0}
                  >
                    {!isConnected ? 'Connect Wallet to Invest' : 'Invest Now'}
                  </Button>
                )}

                {/* ✅ FIXED: Precision-safe Farmer Claim Button in Sidebar */}
                {projectMetrics?.isFarmer && projectMetrics.isCompleted && !project.fundsReleased && (
                  <Button 
                    colorScheme="green" 
                    size="lg" 
                    width="full"
                    leftIcon={<FaHandHoldingUsd />}
                    onClick={onClaimOpen}
                  >
                    Claim {formatNumber(projectMetrics.currentAmount, 2)} USDC
                  </Button>
                )}
                
                <Divider my={2} />
                
                <Box>
                  <Text fontWeight="medium" mb={2}>Project Location</Text>
                  <HStack color="gray.500">
                    <FaMapMarkerAlt />
                    <Text>{project.location}</Text>
                  </HStack>
                </Box>
                
                <Box>
                  <Text fontWeight="medium" mb={2}>Project ID</Text>
                  <Text fontFamily="mono" color="gray.500">#{project.id}</Text>
                </Box>

                <Box>
                  <Text fontWeight="medium" mb={2}>Expected Return</Text>
                  <Text color="green.500" fontWeight="bold">12% annually</Text>
                  <Text fontSize="xs" color="gray.500">Platform estimated return</Text>
                </Box>

                {/* ✅ NEW: Precision Debug Info (only in development) */}
                {process.env.NODE_ENV === 'development' && projectMetrics && (
                  <Box p={3} bg="yellow.50" borderRadius="md" border="1px solid" borderColor="yellow.200">
                    <Text fontSize="xs" fontWeight="bold" color="yellow.700" mb={2}>
                      Debug: Precision Info
                    </Text>
                    <VStack align="stretch" spacing={1}>
                      <HStack justify="space-between">
                        <Text fontSize="xs" color="yellow.600">Current:</Text>
                        <Text fontSize="xs" fontFamily="mono">{project.currentAmountUSDC}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="xs" color="yellow.600">Target:</Text>
                        <Text fontSize="xs" fontFamily="mono">{project.targetAmountUSDC}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="xs" color="yellow.600">Progress:</Text>
                        <Text fontSize="xs" fontFamily="mono">{formatNumber(projectMetrics.fundingProgress, 6)}%</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="xs" color="yellow.600">Completed:</Text>
                        <Text fontSize="xs" fontFamily="mono">{projectMetrics.isCompleted ? 'true' : 'false'}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="xs" color="yellow.600">Difference:</Text>
                        <Text fontSize="xs" fontFamily="mono">
                          {formatNumber(projectMetrics.targetAmount - projectMetrics.currentAmount, 6)} USDC
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>
                )}
              </VStack>
            </Box>
          </Box>
        </SimpleGrid>
      </Stack>

      {/* Investment Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Invest in {project?.title}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Box>
                <Text fontSize="sm" color="gray.500" mb={2}>Your USDC Balance</Text>
                <Text fontSize="lg" fontWeight="bold">{formatNumber(parseFloat(usdcBalance), 2)} USDC</Text>
              </Box>

              {investmentConstraints && (
                <Box p={4} bg="blue.50" borderRadius="md">
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Investment Constraints</Text>
                  <VStack spacing={1} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600">Minimum Required:</Text>
                      <Text fontSize="xs" fontWeight="bold">{formatNumber(parseFloat(investmentConstraints.minInvestment), 2)} USDC</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600">Maximum Allowed:</Text>
                      <Text fontSize="xs">{formatNumber(parseFloat(investmentConstraints.maxInvestment), 2)} USDC</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600">Remaining to Goal:</Text>
                      <Text fontSize="xs" fontWeight="bold" color="green.600">{formatNumber(parseFloat(investmentConstraints.remainingAmount), 6)} USDC</Text>
                    </HStack>
                    {investmentConstraints.canCompleteFunding && (
                      <Alert status="success" mt={2} p={2}>
                        <AlertIcon />
                        <Text fontSize="xs">You can complete the funding for this project!</Text>
                      </Alert>
                    )}
                  </VStack>
                </Box>
              )}
              
              <FormControl>
                <FormLabel>Investment Amount (USDC)</FormLabel>
                <NumberInput 
                  min={investmentConstraints ? parseFloat(investmentConstraints.minInvestment) : 10} 
                  max={Math.min(
                    parseFloat(usdcBalance),
                    investmentConstraints ? parseFloat(investmentConstraints.maxInvestment) : 10000
                  )}
                  precision={2}
                  value={investmentAmount}
                  onChange={setInvestmentAmount}
                >
                  <NumberInputField 
                    placeholder={`Enter amount (min: ${
                      investmentConstraints 
                        ? formatNumber(parseFloat(investmentConstraints.minInvestment), 2) 
                        : '10.00'
                    } USDC)`} 
                  />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {investmentConstraints 
                    ? `Minimum: ${formatNumber(parseFloat(investmentConstraints.minInvestment), 2)} USDC`
                    : 'Minimum investment: 10 USDC'
                  }
                </Text>
              </FormControl>

              {investmentAmount && parseFloat(investmentAmount) >= (investmentConstraints ? parseFloat(investmentConstraints.minInvestment) : 10) && (
                <Box p={4} bg="blue.50" borderRadius="md">
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Investment Summary</Text>
                  <VStack spacing={1} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600">Amount (USDC):</Text>
                      <Text fontSize="xs" fontWeight="bold">{investmentAmount} USDC</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600">Platform Fee (1.5%):</Text>
                      <Text fontSize="xs">{formatNumber(parseFloat(investmentAmount) * 0.015, 2)} USDC</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600">Net Investment:</Text>
                      <Text fontSize="xs" fontWeight="bold">{formatNumber(parseFloat(investmentAmount) * 0.985, 2)} USDC</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600">Expected Annual Return:</Text>
                      <Text fontSize="xs" color="green.600" fontWeight="bold">
                        {formatNumber(parseFloat(investmentAmount) * 0.12, 2)} USDC (12%)
                      </Text>
                    </HStack>
                  </VStack>
                </Box>
              )}

              <Alert status="info" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">Investment Notice</AlertTitle>
                  <AlertDescription fontSize="xs">
                    Your investment will be processed on the blockchain. 
                    Please ensure you have enough MATIC for gas fees.
                  </AlertDescription>
                </Box>
              </Alert>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="brand" 
              onClick={handleInvest}
              isLoading={isInvesting}
              loadingText="Processing..."
              isDisabled={
                !investmentAmount || 
                parseFloat(investmentAmount) < (investmentConstraints ? parseFloat(investmentConstraints.minInvestment) : 10) || 
                parseFloat(investmentAmount) > parseFloat(usdcBalance)
              }
            >
              Confirm Investment
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Fund Claim Modal */}
      <FundClaimModal 
        isOpen={isClaimOpen}
        onClose={onClaimClose}
        project={project}
        onSuccess={handleClaimSuccess}
      />
    </Container>
  );
};

export default ProjectDetail;