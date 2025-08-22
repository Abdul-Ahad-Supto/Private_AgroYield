// frontend/src/components/EnhancedReturnClaimModal.js
import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  VStack,
  HStack,
  Box,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useToast,
  useColorModeValue,
  Divider,
  Badge,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel
} from '@chakra-ui/react';
import { 
  FaCoins, 
  FaCheckCircle, 
  FaChartLine, 
  FaClock,
  FaExclamationTriangle,
  FaInfoCircle,
  FaMoneyBillWave 
} from 'react-icons/fa';
import { useContracts } from '../hooks/useContracts';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';

const EnhancedReturnClaimModal = ({ isOpen, onClose, project, onSuccess }) => {
  const [claiming, setClaiming] = useState(false);
  const [investorReturn, setInvestorReturn] = useState(null);
  const [projectReturnDetails, setProjectReturnDetails] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState('0');
  const [allPendingReturns, setAllPendingReturns] = useState('0');
  const [canClaim, setCanClaim] = useState(false);
  const [claimType, setClaimType] = useState('project'); // 'project' or 'all'
  
  const { claimProjectReturns, claimAllPendingReturns, contracts } = useContracts();
  const { account } = useWeb3();
  const toast = useToast();
  
  // Color mode values
  const alertBg = useColorModeValue('green.50', 'green.900');
  const statBg = useColorModeValue('gray.50', 'gray.700');

  // Fetch return data
  useEffect(() => {
    const fetchReturnData = async () => {
      if (!account || !project?.id || !contracts.investmentManager) return;
      
      try {
        // Get investor's return information for this specific project
        const returnInfo = await contracts.investmentManager.getInvestorProjectReturn(account, project.id);
        setInvestorReturn({
          principalAmount: ethers.utils.formatUnits(returnInfo.principalAmount, 6),
          returnAmount: ethers.utils.formatUnits(returnInfo.returnAmount, 6),
          totalDue: ethers.utils.formatUnits(returnInfo.totalDue, 6),
          principalClaimed: returnInfo.principalClaimed,
          returnClaimed: returnInfo.returnClaimed,
          claimedAt: returnInfo.claimedAt.toString()
        });
        
        // Get project return details
        const projectDetails = await contracts.investmentManager.getProjectReturnDetails(project.id);
        setProjectReturnDetails({
          totalPrincipal: ethers.utils.formatUnits(projectDetails.totalPrincipal, 6),
          expectedReturnAmount: ethers.utils.formatUnits(projectDetails.expectedReturnAmount, 6),
          actualReturnDeposited: ethers.utils.formatUnits(projectDetails.actualReturnDeposited, 6),
          returnDueDate: projectDetails.returnDueDate.toString(),
          farmerDeposited: projectDetails.farmerDeposited,
          distributionCompleted: projectDetails.distributionCompleted,
          claimedAmount: ethers.utils.formatUnits(projectDetails.claimedAmount, 6),
          investorCount: projectDetails.investorCount.toString()
        });
        
        // Get investment amount
        const investAmount = await contracts.investmentManager.getInvestmentAmount(account, project.id);
        setInvestmentAmount(ethers.utils.formatUnits(investAmount, 6));
        
        // Get all pending returns
        const pendingReturns = await contracts.investmentManager.getPendingReturns(account);
        setAllPendingReturns(ethers.utils.formatUnits(pendingReturns, 6));
        
        // Check if can claim (has returns, farmer deposited, and not claimed)
        const canClaimReturns = returnInfo.totalDue && 
                              returnInfo.totalDue !== '0' && 
                              !returnInfo.returnClaimed &&
                              projectDetails.farmerDeposited;
        setCanClaim(canClaimReturns);
        
        console.log('🔍 Enhanced return data:', {
          projectId: project.id,
          investor: account,
          returnInfo,
          projectDetails,
          canClaim: canClaimReturns
        });
        
      } catch (error) {
        console.error('Error fetching enhanced return data:', error);
        setCanClaim(false);
      }
    };

    if (isOpen) {
      fetchReturnData();
    }
  }, [isOpen, account, project?.id, contracts.investmentManager]);

  const handleClaimProjectReturns = async () => {
    if (!project?.id || !claimProjectReturns) return;

    try {
      setClaiming(true);
      
      console.log('🔍 Claiming project returns:', {
        projectId: project.id,
        investor: account,
        totalDue: investorReturn?.totalDue
      });
      
      const result = await claimProjectReturns(project.id);
      
      console.log('✅ Project return claim successful:', result);
      
      toast({
        title: 'Returns Claimed Successfully',
        description: `Your returns for project ${project.id} have been transferred to your wallet`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      if (onSuccess) onSuccess();
      onClose();
      
    } catch (error) {
      console.error('❌ Project return claim error:', error);
    } finally {
      setClaiming(false);
    }
  };

  const handleClaimAllReturns = async () => {
    if (!claimAllPendingReturns) return;

    try {
      setClaiming(true);
      
      console.log('🔍 Claiming all pending returns:', {
        investor: account,
        totalPending: allPendingReturns
      });
      
      const result = await claimAllPendingReturns();
      
      console.log('✅ All returns claim successful:', result);
      
      toast({
        title: 'All Returns Claimed Successfully',
        description: `${allPendingReturns} USDC in pending returns transferred to your wallet`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      if (onSuccess) onSuccess();
      onClose();
      
    } catch (error) {
      console.error('❌ All returns claim error:', error);
    } finally {
      setClaiming(false);
    }
  };

  const formatNumber = (num, decimals = 2) => {
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    return numValue.toFixed(decimals);
  };

  const calculateReturnRate = () => {
    if (!investorReturn || parseFloat(investorReturn.principalAmount) === 0) return 0;
    const principal = parseFloat(investorReturn.principalAmount);
    const returnAmt = parseFloat(investorReturn.returnAmount);
    return (returnAmt / principal) * 100;
  };

  const getClaimableStatus = () => {
    if (!investorReturn || !projectReturnDetails) return 'loading';
    
    if (parseFloat(investmentAmount) === 0) return 'not_invested';
    if (investorReturn.returnClaimed) return 'claimed';
    if (!projectReturnDetails.farmerDeposited) return 'not_deposited';
    if (parseFloat(investorReturn.totalDue) === 0) return 'no_returns';
    return 'claimable';
  };

  const claimableStatus = getClaimableStatus();

  if (!project) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack spacing={3}>
            <FaCoins color="#38A169" />
            <Text>Claim Investment Returns</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <Tabs variant="enclosed" colorScheme="green">
            <TabList>
              <Tab>This Project</Tab>
              <Tab>All Returns</Tab>
            </TabList>

            <TabPanels>
              {/* Single Project Tab */}
              <TabPanel px={0}>
                <VStack spacing={6} align="stretch">
                  {/* Project Summary */}
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" mb={2}>
                      {project.title}
                    </Text>
                    <HStack spacing={2} mb={4}>
                      <Badge colorScheme="green" px={3} py={1} borderRadius="full">
                        Project #{project.id}
                      </Badge>
                      <Badge colorScheme="blue" px={3} py={1} borderRadius="full">
                        Return Claim
                      </Badge>
                      {projectReturnDetails?.farmerDeposited && (
                        <Badge colorScheme="purple" px={3} py={1} borderRadius="full">
                          Returns Available
                        </Badge>
                      )}
                    </HStack>
                  </Box>

                  {/* Investment & Return Summary */}
                  {investorReturn && (
                    <Box p={4} bg={statBg} borderRadius="lg">
                      <VStack spacing={4} align="stretch">
                        <Text fontWeight="bold" mb={2}>Your Investment & Returns</Text>
                        
                        <HStack justify="space-between">
                          <VStack align="start" spacing={0}>
                            <Text fontSize="sm" color="gray.500">Your Investment</Text>
                            <Text fontSize="xl" fontWeight="bold" color="blue.500">
                              {formatNumber(parseFloat(investmentAmount), 6)} USDC
                            </Text>
                          </VStack>
                          
                          <VStack align="center" spacing={0}>
                            <Text fontSize="sm" color="gray.500">Return Amount</Text>
                            <Text fontSize="xl" fontWeight="bold" color="green.500">
                              {formatNumber(parseFloat(investorReturn.returnAmount), 6)} USDC
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              ({formatNumber(calculateReturnRate(), 1)}% return)
                            </Text>
                          </VStack>
                          
                          <VStack align="end" spacing={0}>
                            <Text fontSize="sm" color="gray.500">Total Due</Text>
                            <Text fontSize="xl" fontWeight="bold" color="purple.500">
                              {formatNumber(parseFloat(investorReturn.totalDue), 6)} USDC
                            </Text>
                          </VStack>
                        </HStack>

                        <Progress 
                          value={parseFloat(investorReturn.totalDue) > 0 ? 100 : 0} 
                          colorScheme="green" 
                          size="sm" 
                          borderRadius="full"
                        />
                      </VStack>
                    </Box>
                  )}

                  {/* Project Return Details */}
                  {projectReturnDetails && (
                    <Box p={4} bg="blue.50" borderRadius="lg" borderWidth="1px" borderColor="blue.200">
                      <Text fontWeight="bold" color="blue.700" mb={3}>
                        Project Return Details
                      </Text>
                      
                      <VStack spacing={2} align="stretch">
                        <HStack justify="space-between">
                          <Text fontSize="sm" color="blue.600">Total Project Investment:</Text>
                          <Text fontSize="sm" fontWeight="bold" color="blue.700">
                            {formatNumber(parseFloat(projectReturnDetails.totalPrincipal), 6)} USDC
                          </Text>
                        </HStack>
                        
                        <HStack justify="space-between">
                          <Text fontSize="sm" color="blue.600">Expected Returns:</Text>
                          <Text fontSize="sm" color="blue.600">
                            {formatNumber(parseFloat(projectReturnDetails.expectedReturnAmount), 6)} USDC
                          </Text>
                        </HStack>
                        
                        <HStack justify="space-between">
                          <Text fontSize="sm" color="blue.600">Actual Deposited:</Text>
                          <Text fontSize="sm" fontWeight="bold" color="blue.700">
                            {formatNumber(parseFloat(projectReturnDetails.actualReturnDeposited), 6)} USDC
                          </Text>
                        </HStack>

                        <HStack justify="space-between">
                          <Text fontSize="sm" color="blue.600">Total Investors:</Text>
                          <Text fontSize="sm" color="blue.600">
                            {projectReturnDetails.investorCount}
                          </Text>
                        </HStack>

                        <HStack justify="space-between">
                          <Text fontSize="sm" color="blue.600">Already Claimed:</Text>
                          <Text fontSize="sm" color="blue.600">
                            {formatNumber(parseFloat(projectReturnDetails.claimedAmount), 6)} USDC
                          </Text>
                        </HStack>
                      </VStack>
                    </Box>
                  )}

                  {/* Status Messages */}
                  {claimableStatus === 'loading' && (
                    <Alert status="info" borderRadius="lg">
                      <AlertIcon />
                      <Box>
                        <AlertTitle fontSize="sm">Loading Return Information...</AlertTitle>
                        <AlertDescription fontSize="sm">
                          Checking your return status for this project...
                        </AlertDescription>
                      </Box>
                    </Alert>
                  )}

                  {claimableStatus === 'not_invested' && (
                    <Alert status="warning" borderRadius="lg">
                      <AlertIcon />
                      <Box>
                        <AlertTitle fontSize="sm">No Investment Found</AlertTitle>
                        <AlertDescription fontSize="sm">
                          You have not invested in this project.
                        </AlertDescription>
                      </Box>
                    </Alert>
                  )}

                  {claimableStatus === 'claimed' && (
                    <Alert status="info" borderRadius="lg">
                      <AlertIcon />
                      <Box>
                        <AlertTitle fontSize="sm">Returns Already Claimed</AlertTitle>
                        <AlertDescription fontSize="sm">
                          You have already claimed your returns for this project on{' '}
                          {investorReturn.claimedAt && investorReturn.claimedAt !== '0' 
                            ? new Date(parseInt(investorReturn.claimedAt) * 1000).toLocaleDateString()
                            : 'a previous date'
                          }.
                        </AlertDescription>
                      </Box>
                    </Alert>
                  )}

                  {claimableStatus === 'not_deposited' && (
                    <Alert status="warning" borderRadius="lg">
                      <AlertIcon />
                      <Box>
                        <AlertTitle fontSize="sm">Returns Not Available Yet</AlertTitle>
                        <AlertDescription fontSize="sm">
                          The farmer has not yet deposited returns for this project. 
                          Returns are due on{' '}
                          {projectReturnDetails?.returnDueDate && projectReturnDetails.returnDueDate !== '0'
                            ? new Date(parseInt(projectReturnDetails.returnDueDate) * 1000).toLocaleDateString()
                            : 'an upcoming date'
                          }.
                        </AlertDescription>
                      </Box>
                    </Alert>
                  )}

                  {claimableStatus === 'no_returns' && (
                    <Alert status="warning" borderRadius="lg">
                      <AlertIcon />
                      <Box>
                        <AlertTitle fontSize="sm">No Returns Available</AlertTitle>
                        <AlertDescription fontSize="sm">
                          No returns are currently available for this investment.
                        </AlertDescription>
                      </Box>
                    </Alert>
                  )}

                  {claimableStatus === 'claimable' && (
                    <Alert status="success" borderRadius="lg" bg={alertBg}>
                      <AlertIcon />
                      <Box>
                        <AlertTitle fontSize="sm">Returns Ready to Claim!</AlertTitle>
                        <AlertDescription fontSize="sm">
                          Your investment returns are available! You can claim {formatNumber(parseFloat(investorReturn.totalDue), 6)} USDC 
                          (principal + returns) from your {formatNumber(parseFloat(investmentAmount), 6)} USDC investment.
                        </AlertDescription>
                      </Box>
                    </Alert>
                  )}
                </VStack>
              </TabPanel>

              {/* All Returns Tab */}
              <TabPanel px={0}>
                <VStack spacing={6} align="stretch">
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" mb={2}>
                      All Pending Returns
                    </Text>
                    <Text color="gray.600" mb={4}>
                      Claim all your pending returns across all projects at once.
                    </Text>
                  </Box>

                  <Box p={4} bg={statBg} borderRadius="lg">
                    <HStack justify="space-between" mb={4}>
                      <VStack align="start" spacing={0}>
                        <Text fontSize="sm" color="gray.500">Total Pending</Text>
                        <Text fontSize="2xl" fontWeight="bold" color="green.500">
                          {formatNumber(parseFloat(allPendingReturns), 6)} USDC
                        </Text>
                      </VStack>
                      
                      <Box textAlign="right">
                        <Text fontSize="sm" color="gray.500">Across All Projects</Text>
                        <Text fontSize="lg" fontWeight="bold">
                          Multiple Projects
                        </Text>
                      </Box>
                    </HStack>

                    {parseFloat(allPendingReturns) > 0 ? (
                      <Alert status="success" borderRadius="md">
                        <AlertIcon />
                        <Box>
                          <AlertTitle fontSize="sm">Returns Available!</AlertTitle>
                          <AlertDescription fontSize="sm">
                            You have pending returns ready to claim from multiple projects.
                          </AlertDescription>
                        </Box>
                      </Alert>
                    ) : (
                      <Alert status="info" borderRadius="md">
                        <AlertIcon />
                        <Box>
                          <AlertTitle fontSize="sm">No Pending Returns</AlertTitle>
                          <AlertDescription fontSize="sm">
                            You currently have no pending returns across all projects.
                          </AlertDescription>
                        </Box>
                      </Alert>
                    )}
                  </Box>

                  <Alert status="info" borderRadius="lg">
                    <AlertIcon />
                    <Box>
                      <AlertTitle fontSize="sm">Bulk Claim Benefits</AlertTitle>
                      <AlertDescription fontSize="sm">
                        Claiming all pending returns at once saves on gas fees and is more convenient 
                        than claiming from each project individually.
                      </AlertDescription>
                    </Box>
                  </Alert>
                </VStack>
              </TabPanel>
            </TabPanels>
          </Tabs>

          {/* Additional Information */}
          <Alert status="info" borderRadius="lg" mt={6}>
            <AlertIcon />
            <Box>
              <AlertTitle fontSize="sm">About Return Claims</AlertTitle>
              <AlertDescription fontSize="sm">
                Returns include both your original investment (principal) and any profits earned. 
                Once claimed, funds will be transferred to your wallet immediately.
              </AlertDescription>
            </Box>
          </Alert>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3} w="100%" justify="space-between">
            <Button variant="outline" onClick={onClose} isDisabled={claiming}>
              Close
            </Button>
            
            <HStack spacing={3}>
              {/* Project-specific claim button */}
              {claimableStatus === 'claimable' ? (
                <Button
      colorScheme="green"
      leftIcon={<FaCheckCircle />}
      isLoading={claiming && claimType === 'project'}
      loadingText="Claiming..."
      size="lg"
      onClick={() => {
        setClaimType('project');
        handleClaimProjectReturns();
      }}
    >
      Claim {formatNumber(parseFloat(investorReturn?.totalDue || 0), 6)} USDC
</Button>

              ) : claimableStatus === 'claimed' ? (
                <Button colorScheme="gray" isDisabled={true} size="lg">
                  Already Claimed
                </Button>
              ) : (
                <Button colorScheme="gray" isDisabled={true} size="lg">
                  {claimableStatus === 'not_invested' ? 'Not Invested' :
                   claimableStatus === 'not_deposited' ? 'Returns Not Available' :
                   claimableStatus === 'no_returns' ? 'No Returns' : 'Not Available'}
                </Button>
              )}

              {/* All returns claim button */}
              {parseFloat(allPendingReturns) > 0 && (
                <Button
                  colorScheme="purple"
                  leftIcon={<FaMoneyBillWave />}
                  onClick={() => {
                    setClaimType('all');
                    handleClaimAllReturns();
                  }}
                  isLoading={claiming && claimType === 'all'}
                  loadingText="Claiming All..."
                  size="lg"
                  variant="outline"
                >
                  Claim All ({formatNumber(parseFloat(allPendingReturns), 6)} USDC)
                </Button>
              )}
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ReturnClaimModal;