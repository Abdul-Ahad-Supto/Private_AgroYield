// frontend/src/components/ReturnClaimModal.js - NEW COMPONENT FOR INVESTOR RETURN CLAIMS
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
  StatHelpText
} from '@chakra-ui/react';
import { FaCoins, FaCheckCircle, FaChartLine } from 'react-icons/fa';
import { useContracts } from '../hooks/useContracts';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';

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

const ReturnClaimModal = ({ isOpen, onClose, project, onSuccess }) => {
  const [claiming, setClaiming] = useState(false);
  const [investorReturn, setInvestorReturn] = useState(null);
  const [investmentAmount, setInvestmentAmount] = useState('0');
  const [canClaim, setCanClaim] = useState(false);
  
  const { claimInvestorReturns, contracts } = useContracts();
  const { account } = useWeb3();
  const toast = useToast();
  
  // Color mode values
  const alertBg = useColorModeValue('green.50', 'green.900');
  const statBg = useColorModeValue('gray.50', 'gray.700');

  // Fetch investor return data
  useEffect(() => {
    const fetchReturnData = async () => {
      if (!account || !project?.id || !contracts.investmentManager) return;
      
      try {
        // Get investor's return information for this specific project
        const returnInfo = await contracts.investmentManager.getInvestorProjectReturn(account, project.id);
        setInvestorReturn(returnInfo);
        
        // Get investment amount
        const investAmount = await contracts.investmentManager.getInvestmentAmount(account, project.id);
        setInvestmentAmount(ethers.utils.formatUnits(investAmount, 6));
        
        // Check if can claim (has returns and not claimed)
        const canClaimReturns = returnInfo.returnAmount && 
                              returnInfo.returnAmount !== '0' && 
                              !returnInfo.claimed;
        setCanClaim(canClaimReturns);
        
        console.log('🔍 Investor return data:', {
          projectId: project.id,
          investor: account,
          returnInfo,
          investmentAmount: ethers.utils.formatUnits(investAmount, 6),
          canClaim: canClaimReturns
        });
        
      } catch (error) {
        console.error('Error fetching return data:', error);
        setCanClaim(false);
      }
    };

    if (isOpen) {
      fetchReturnData();
    }
  }, [isOpen, account, project?.id, contracts.investmentManager]);

  const handleClaimReturns = async () => {
    if (!project?.id || !claimInvestorReturns) return;

    try {
      setClaiming(true);
      
      console.log('🔍 Claiming investor returns:', {
        projectId: project.id,
        investor: account,
        returnAmount: investorReturn?.returnAmount
      });
      
      const result = await claimInvestorReturns(project.id);
      
      console.log('✅ Return claim successful:', result);
      
      toast({
        title: 'Returns Claimed Successfully',
        description: `Your ETH returns have been transferred to your wallet`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Success - close modal and refresh data
      if (onSuccess) {
        onSuccess();
      }
      onClose();
      
    } catch (error) {
      console.error('❌ Return claim error:', error);
      // Error handling is done in the hook
    } finally {
      setClaiming(false);
    }
  };

  if (!project) {
    return null;
  }

  const returnAmountETH = investorReturn?.returnAmount ? 
    parseFloat(ethers.utils.formatEther(investorReturn.returnAmount)) : 0;
  
  const investmentAmountUSDC = parseFloat(investmentAmount || '0');
  const returnPercentage = investmentAmountUSDC > 0 ? 
    (returnAmountETH * 2000 / investmentAmountUSDC) * 100 : 0; // Rough ETH to USDC conversion for display

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
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
              </HStack>
            </Box>

            {/* Investment Summary */}
            <Box p={4} bg={statBg} borderRadius="lg">
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" color="gray.500">Your Investment</Text>
                    <Text fontSize="xl" fontWeight="bold" color="blue.500">
                      {formatNumber(investmentAmountUSDC, 2)} USDC
                    </Text>
                  </VStack>
                  
                  <VStack align="center" spacing={0}>
                    <Text fontSize="sm" color="gray.500">Return Amount</Text>
                    <Text fontSize="xl" fontWeight="bold" color="green.500">
                      {formatNumber(returnAmountETH, 4)} ETH
                    </Text>
                  </VStack>
                  
                  <VStack align="end" spacing={0}>
                    <Text fontSize="sm" color="gray.500">Return Rate</Text>
                    <HStack>
                      <FaChartLine color="purple" />
                      <Text fontSize="lg" fontWeight="bold" color="purple.500">
                        ~{formatNumber(returnPercentage, 1)}%
                      </Text>
                    </HStack>
                  </VStack>
                </HStack>
              </VStack>
            </Box>

            <Divider />

            {/* Return Status */}
            {!investorReturn ? (
              <Alert status="info" borderRadius="lg">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">Loading Return Information...</AlertTitle>
                  <AlertDescription fontSize="sm">
                    Checking your return status for this project...
                  </AlertDescription>
                </Box>
              </Alert>
            ) : investorReturn.claimed ? (
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
            ) : !investorReturn.returnAmount || investorReturn.returnAmount === '0' ? (
              <Alert status="warning" borderRadius="lg">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">No Returns Available</AlertTitle>
                  <AlertDescription fontSize="sm">
                    The farmer has not yet deposited returns for this project, or you did not invest in this project.
                  </AlertDescription>
                </Box>
              </Alert>
            ) : canClaim ? (
              <Alert status="success" borderRadius="lg" bg={alertBg}>
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">Returns Ready to Claim!</AlertTitle>
                  <AlertDescription fontSize="sm">
                    Your investment returns are available! You can claim {formatNumber(returnAmountETH, 4)} ETH 
                    from your {formatNumber(investmentAmountUSDC, 2)} USDC investment.
                  </AlertDescription>
                </Box>
              </Alert>
            ) : (
              <Alert status="warning" borderRadius="lg">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">Cannot Claim Returns</AlertTitle>
                  <AlertDescription fontSize="sm">
                    Returns are not available for claiming at this time.
                  </AlertDescription>
                </Box>
              </Alert>
            )}

            {/* Claim Details */}
            {canClaim && investorReturn && (
              <Box p={4} bg="green.50" borderRadius="lg" borderWidth="1px" borderColor="green.200">
                <VStack spacing={3} align="stretch">
                  <Text fontWeight="bold" color="green.700">
                    Return Claim Details
                  </Text>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="green.600">Principal Investment:</Text>
                    <Text fontSize="sm" fontWeight="bold" color="green.700">
                      {formatNumber(investmentAmountUSDC, 2)} USDC
                    </Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="green.600">Return Amount:</Text>
                    <Text fontSize="sm" fontWeight="bold" color="green.700">
                      {formatNumber(returnAmountETH, 4)} ETH
                    </Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="green.600">Proportional Share:</Text>
                    <Text fontSize="sm" color="green.600">
                      Based on your investment amount
                    </Text>
                  </HStack>
                  
                  <Text fontSize="xs" color="green.600" mt={2}>
                    * ETH will be transferred directly to your connected wallet
                  </Text>
                </VStack>
              </Box>
            )}

            {/* Investment History */}
            {investmentAmountUSDC > 0 && (
              <Box p={4} bg="blue.50" borderRadius="lg" borderWidth="1px" borderColor="blue.200">
                <VStack spacing={3} align="stretch">
                  <Text fontWeight="bold" color="blue.700">
                    Your Investment History
                  </Text>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="blue.600">Project:</Text>
                    <Text fontSize="sm" color="blue.600">{project.title}</Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="blue.600">Investment:</Text>
                    <Text fontSize="sm" fontWeight="bold" color="blue.700">
                      {formatNumber(investmentAmountUSDC, 2)} USDC
                    </Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="blue.600">Status:</Text>
                    <Badge colorScheme={canClaim ? "green" : investorReturn?.claimed ? "purple" : "gray"}>
                      {canClaim ? "Ready to Claim" : investorReturn?.claimed ? "Claimed" : "Pending"}
                    </Badge>
                  </HStack>
                </VStack>
              </Box>
            )}

            {/* Important Notes */}
            <Alert status="info" borderRadius="lg">
              <AlertIcon />
              <Box>
                <AlertTitle fontSize="sm">About Return Claims</AlertTitle>
                <AlertDescription fontSize="sm">
                  Returns are distributed proportionally based on your investment amount. 
                  Once claimed, the ETH will be transferred to your wallet immediately.
                </AlertDescription>
              </Box>
            </Alert>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3} w="100%" justify="space-between">
            <Button variant="outline" onClick={onClose} isDisabled={claiming}>
              Close
            </Button>
            
            {canClaim ? (
              <Button
                colorScheme="green"
                leftIcon={<FaCheckCircle />}
                onClick={handleClaimReturns}
                isLoading={claiming}
                loadingText="Claiming Returns..."
                size="lg"
              >
                Claim {formatNumber(returnAmountETH, 4)} ETH
              </Button>
            ) : investorReturn?.claimed ? (
              <Button
                colorScheme="gray"
                isDisabled={true}
                size="lg"
              >
                Already Claimed
              </Button>
            ) : (
              <Button
                colorScheme="gray"
                isDisabled={true}
                size="lg"
              >
                {investmentAmountUSDC === 0 ? 'No Investment' : 'Returns Not Available'}
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ReturnClaimModal;