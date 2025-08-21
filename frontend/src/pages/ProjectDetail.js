// frontend/src/pages/ProjectDetail.js - COMPLETE FIXED VERSION with Claim Button Fix
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

  // Memoized calculations - FIXED with proper null checks
  const projectMetrics = useMemo(() => {
    // ✅ Add null check first
    if (!project) return null;

    const fundingProgress = project.targetAmountUSDC > 0 
      ? (parseFloat(project.currentAmountUSDC) / parseFloat(project.targetAmountUSDC)) * 100 
      : 0;

    const daysLeft = project.deadline ? 
      Math.max(0, Math.floor((new Date(parseInt(project.deadline) * 1000) - new Date()) / (1000 * 60 * 60 * 24))) 
      : 'N/A';

    const isCompleted = fundingProgress >= 100;
    
    // ✅ Add null check for account and project.farmer
    const isFarmer = account && project.farmer && account.toLowerCase() === project.farmer.toLowerCase();

    return {
      fundingProgress: Math.min(fundingProgress, 100),
      daysLeft,
      currentAmount: parseFloat(project.currentAmountUSDC || '0'),
      targetAmount: parseFloat(project.targetAmountUSDC || '0'),
      investorCount: project.investorCount || '0',
      isCompleted,
      isFarmer
    };
  }, [project, account]);

  // Fetch additional data - UPDATED with claim button fix
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
      
      // ✅ UPDATED - Check claim eligibility with tolerance for 99.99%+ projects
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
        
        // ✅ If smart contract says no, check if 99.99%+ funded (rounding tolerance)
        if (!canClaim && projectMetrics) {
          const isNearlyComplete = projectMetrics.fundingProgress >= 99.99;
          const isNotReleased = !project.fundsReleased;
          canClaim = isNearlyComplete && isNotReleased;
          
          if (canClaim) {
            console.log('✅ Allowing claim due to 99.99%+ funding (rounding tolerance)', {
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

  // Get project status - FIXED with proper status mapping
  const getProjectStatus = useMemo(() => {
    // ✅ Add proper null checks
    if (!project) return { text: 'Loading...', color: 'gray' };
    if (!projectMetrics) return { text: 'Loading...', color: 'gray' };
    
    // Check funds released first
    if (project.fundsReleased || project.status === 3) {
      return { text: 'Funds Released', color: 'purple' };
    }
    
    // Map the actual blockchain status values
    switch (Number(project.status)) { // ✅ Convert to number
      case 0: // Active
        if (projectMetrics.isCompleted || projectMetrics.fundingProgress >= 99.99) {
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

  // Add debug logging when project exists
  useEffect(() => {
    if (project) {
      console.log('Project Debug:', {
        id: project.id,
        currentAmountUSDC: project.currentAmountUSDC,
        targetAmountUSDC: project.targetAmountUSDC,
        status: project.status,
        statusType: typeof project.status,
        statusNumber: Number(project.status),
        fundsReleased: project.fundsReleased,
        fundingProgress: (parseFloat(project.currentAmountUSDC) / parseFloat(project.targetAmountUSDC)) * 100
      });
    }
  }, [project]);
  useEffect(() => {
  if (projectMetrics && project) {
    console.log('🔍 Claim Debug Check:', {
      'projectMetrics?.isFarmer': projectMetrics?.isFarmer,
      'projectMetrics.isCompleted': projectMetrics?.isCompleted,
      'projectMetrics.fundingProgress': projectMetrics?.fundingProgress,
      'fundingProgress >= 99.99': projectMetrics?.fundingProgress >= 99.99,
      'project.fundsReleased': project?.fundsReleased,
      'shouldShowButton': projectMetrics?.isFarmer && (projectMetrics?.isCompleted || projectMetrics?.fundingProgress >= 99.99) && !project?.fundsReleased
    });
  }
}, [projectMetrics, project]);

  // Add debug for claim button
  useEffect(() => {
    if (projectMetrics && project) {
      console.log('Claim Button Debug:', {
        isFarmer: projectMetrics.isFarmer,
        isCompleted: projectMetrics.isCompleted,
        fundingProgress: projectMetrics.fundingProgress,
        fundsReleased: project.fundsReleased,
        canClaimProjectFunds,
        shouldShowClaim: projectMetrics.isFarmer && (projectMetrics.isCompleted || projectMetrics.fundingProgress >= 99.99) && !project.fundsReleased
      });
    }
  }, [projectMetrics, project, canClaimProjectFunds]);

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

                {/* Farmer Actions Tab - UPDATED with claim button fix */}
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
                              
                              {(projectMetrics.isCompleted || projectMetrics.fundingProgress >= 99.99) ? (
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
                                {projectMetrics.currentAmount.toFixed(2)} USDC
                              </Text>
                            </HStack>

                            {/* ✅ UPDATED claim button condition */}
                            {(projectMetrics.isCompleted || projectMetrics.fundingProgress >= 99.99) && !project.fundsReleased ? (
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
                                    Current: {projectMetrics.fundingProgress.toFixed(2)}%
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
                        Raised of {projectMetrics.targetAmount.toLocaleString()} USDC goal
                      </Text>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Text fontSize="2xl" fontWeight="bold" mr={2}>
                          {projectMetrics.currentAmount.toFixed(2)} USDC
                        </Text>
                        <Text color="green.500" fontWeight="medium">
                          {Math.round(projectMetrics.fundingProgress)}%
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
                    <Text fontWeight="bold">{parseFloat(usdcBalance).toFixed(2)} USDC</Text>
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
                          {parseFloat(investmentConstraints.minInvestment).toFixed(2)} USDC
                        </Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="xs" color="blue.600">Maximum:</Text>
                        <Text fontSize="xs" color="blue.600">
                          {parseFloat(investmentConstraints.maxInvestment).toFixed(2)} USDC
                        </Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="xs" color="blue.600">Remaining:</Text>
                        <Text fontSize="xs" fontWeight="bold" color="blue.700">
                          {parseFloat(investmentConstraints.remainingAmount).toFixed(2)} USDC
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
                {(projectMetrics?.isCompleted || projectMetrics?.fundingProgress >= 99.99) ? (
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

                {/* ✅ UPDATED Farmer Claim Button in Sidebar */}
                {projectMetrics?.isFarmer && (projectMetrics.isCompleted || projectMetrics.fundingProgress >= 99.99) && !project.fundsReleased && (
                  <Button 
                    colorScheme="green" 
                    size="lg" 
                    width="full"
                    leftIcon={<FaHandHoldingUsd />}
                    onClick={onClaimOpen}
                  >
                    Claim {projectMetrics.currentAmount.toFixed(2)} USDC
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
                <Text fontSize="lg" fontWeight="bold">{parseFloat(usdcBalance).toFixed(2)} USDC</Text>
              </Box>

              {investmentConstraints && (
                <Box p={4} bg="blue.50" borderRadius="md">
                  <Text fontSize="sm" fontWeight="medium" mb={2}>Investment Constraints</Text>
                  <VStack spacing={1} align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600">Minimum Required:</Text>
                      <Text fontSize="xs" fontWeight="bold">{parseFloat(investmentConstraints.minInvestment).toFixed(2)} USDC</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600">Maximum Allowed:</Text>
                      <Text fontSize="xs">{parseFloat(investmentConstraints.maxInvestment).toFixed(2)} USDC</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600">Remaining to Goal:</Text>
                      <Text fontSize="xs" fontWeight="bold" color="green.600">{parseFloat(investmentConstraints.remainingAmount).toFixed(2)} USDC</Text>
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
                        ? parseFloat(investmentConstraints.minInvestment).toFixed(2) 
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
                    ? `Minimum: ${parseFloat(investmentConstraints.minInvestment).toFixed(2)} USDC`
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
                      <Text fontSize="xs">{(parseFloat(investmentAmount) * 0.015).toFixed(2)} USDC</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600">Net Investment:</Text>
                      <Text fontSize="xs" fontWeight="bold">{(parseFloat(investmentAmount) * 0.985).toFixed(2)} USDC</Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600">Expected Annual Return:</Text>
                      <Text fontSize="xs" color="green.600" fontWeight="bold">
                        {(parseFloat(investmentAmount) * 0.12).toFixed(2)} USDC (12%)
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