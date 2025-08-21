// frontend/src/components/FundClaimModal.js - PRECISION-SAFE VERSION
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
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useToast,
  useColorModeValue,
  Divider,
  Badge,
  Progress
} from '@chakra-ui/react';
import { FaMoneyBillWave, FaCheckCircle, FaClock } from 'react-icons/fa';
import { useContracts } from '../hooks/useContracts';

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
 * Check if project is completed with tolerance for rounding errors
 * @param {string|number} currentAmount - Current funding amount
 * @param {string|number} targetAmount - Target funding amount
 * @param {number} tolerance - Tolerance percentage (default 0.001 = 0.1%)
 * @returns {boolean} - Whether project is effectively completed
 */
const isProjectCompleted = (currentAmount, targetAmount, tolerance = 0.001) => {
  const currentInt = toSafeInteger(currentAmount, 6);
  const targetInt = toSafeInteger(targetAmount, 6);
  
  if (targetInt === 0) return false;
  
  // Calculate the difference in "safe integer" space
  const difference = targetInt - currentInt;
  const toleranceInt = Math.round(targetInt * tolerance);
  
  console.log('🔍 FundClaimModal - Completion Check (Precision-Safe):', {
    currentAmount: currentAmount,
    targetAmount: targetAmount,
    currentInt,
    targetInt,
    difference,
    toleranceInt,
    isCompleted: difference <= toleranceInt,
    percentageComplete: ((currentInt / targetInt) * 100).toFixed(6)
  });
  
  // Project is completed if the difference is within tolerance
  return difference <= toleranceInt;
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
 * Format number for display with consistent precision
 * @param {string|number} num - Number to format
 * @param {number} decimals - Decimal places
 * @returns {string} - Formatted number
 */
const formatNumber = (num, decimals = 2) => {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  return numValue.toFixed(decimals);
};

const FundClaimModal = ({ isOpen, onClose, project, onSuccess }) => {
  const [canClaim, setCanClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  
  const { claimProjectFunds, canClaimFunds } = useContracts();
  const toast = useToast();
  
  // Color mode values
  const alertBg = useColorModeValue('green.50', 'green.900');
  const statBg = useColorModeValue('gray.50', 'gray.700');

  // ✅ UPDATED - Check if funds can be claimed with precision-safe calculations
  useEffect(() => {
    const checkEligibility = async () => {
      if (!project?.id) return;
      
      try {
        setCheckingEligibility(true);
        let eligible = false;
        
        // First check smart contract
        if (canClaimFunds) {
          try {
            eligible = await canClaimFunds(project.id);
            console.log('🔍 Smart contract canClaimFunds result:', eligible);
          } catch (error) {
            console.log('Smart contract canClaimFunds failed:', error);
          }
        }
        
        // ✅ If smart contract says no, check using precision-safe calculation
        if (!eligible && project) {
          const isNearlyComplete = isProjectCompleted(
            project.currentAmountUSDC, 
            project.targetAmountUSDC,
            0.001 // 0.1% tolerance for rounding errors
          );
          const isNotReleased = !project.fundsReleased;
          eligible = isNearlyComplete && isNotReleased;
          
          if (eligible) {
            console.log('✅ FundClaimModal: Allowing claim due to precision-safe completion check', {
              currentAmount: project.currentAmountUSDC,
              targetAmount: project.targetAmountUSDC,
              fundingProgress: calculatePreciseFundingProgress(project.currentAmountUSDC, project.targetAmountUSDC),
              fundsReleased: project.fundsReleased,
              difference: parseFloat(project.targetAmountUSDC) - parseFloat(project.currentAmountUSDC)
            });
          } else {
            console.log('❌ FundClaimModal: Project not eligible for claim', {
              currentAmount: project.currentAmountUSDC,
              targetAmount: project.targetAmountUSDC,
              fundingProgress: calculatePreciseFundingProgress(project.currentAmountUSDC, project.targetAmountUSDC),
              fundsReleased: project.fundsReleased,
              difference: parseFloat(project.targetAmountUSDC) - parseFloat(project.currentAmountUSDC)
            });
          }
        }
        
        setCanClaim(eligible);
        
      } catch (error) {
        console.error('Error checking fund claim eligibility:', error);
        setCanClaim(false);
      } finally {
        setCheckingEligibility(false);
      }
    };

    if (isOpen) {
      checkEligibility();
    }
  }, [isOpen, project?.id, project?.currentAmountUSDC, project?.targetAmountUSDC, project?.fundsReleased, canClaimFunds]);

  const handleClaimFunds = async () => {
    if (!project?.id || !claimProjectFunds) return;

    try {
      setClaiming(true);
      
      await claimProjectFunds(project.id);
      
      // Success - close modal and refresh data
      if (onSuccess) {
        onSuccess();
      }
      onClose();
      
    } catch (error) {
      console.error('Fund claim failed:', error);
      // Error handling is done in useContracts hook
    } finally {
      setClaiming(false);
    }
  };

  if (!project) {
    return null;
  }

  // ✅ Use precision-safe calculations
  const fundingProgress = calculatePreciseFundingProgress(
    project.currentAmountUSDC, 
    project.targetAmountUSDC
  );
  
  const isCompleted = isProjectCompleted(
    project.currentAmountUSDC, 
    project.targetAmountUSDC,
    0.001 // 0.1% tolerance
  );
  
  const raisedAmount = parseFloat(project.currentAmountUSDC || '0');

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack spacing={3}>
            <FaMoneyBillWave color="#38A169" />
            <Text>Claim Project Funds</Text>
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
                <Badge 
                  colorScheme={isCompleted ? 'purple' : 'green'} 
                  px={3} py={1} borderRadius="full"
                >
                  {isCompleted ? 'Fully Funded' : 'Active'}
                </Badge>
              </HStack>
            </Box>

            {/* Funding Status */}
            <Box p={4} bg={statBg} borderRadius="lg">
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Text fontWeight="medium">Funding Progress</Text>
                  <Text fontWeight="bold" color="green.500">
                    {formatNumber(fundingProgress, 3)}%
                  </Text>
                </HStack>
                
                <Progress 
                  value={Math.min(fundingProgress, 100)} 
                  colorScheme="green" 
                  size="lg" 
                  borderRadius="full"
                />
                
                <HStack justify="space-between">
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" color="gray.500">Raised</Text>
                    <Text fontSize="xl" fontWeight="bold" color="green.500">
                      {formatNumber(raisedAmount, 2)} USDC
                    </Text>
                  </VStack>
                  
                  <VStack align="end" spacing={0}>
                    <Text fontSize="sm" color="gray.500">Target</Text>
                    <Text fontSize="xl" fontWeight="bold">
                      {formatNumber(parseFloat(project.targetAmountUSDC || '0'), 2)} USDC
                    </Text>
                  </VStack>
                </HStack>
                
                <HStack justify="space-between" pt={2}>
                  <HStack spacing={2}>
                    <FaClock color="orange" />
                    <Text fontSize="sm">
                      {project.investorCount || '0'} investors
                    </Text>
                  </HStack>
                  
                  <Text fontSize="sm" color="gray.500">
                    Created: {project.createdAt ? new Date(parseInt(project.createdAt) * 1000).toLocaleDateString() : 'N/A'}
                  </Text>
                </HStack>

                {/* ✅ NEW: Precision debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <Box p={2} bg="yellow.50" borderRadius="md" border="1px solid" borderColor="yellow.200">
                    <Text fontSize="xs" fontWeight="bold" color="yellow.700" mb={1}>
                      Debug: Precision Analysis
                    </Text>
                    <VStack align="stretch" spacing={1}>
                      <HStack justify="space-between">
                        <Text fontSize="xs" color="yellow.600">Raw Current:</Text>
                        <Text fontSize="xs" fontFamily="mono">{project.currentAmountUSDC}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="xs" color="yellow.600">Raw Target:</Text>
                        <Text fontSize="xs" fontFamily="mono">{project.targetAmountUSDC}</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="xs" color="yellow.600">Difference:</Text>
                        <Text fontSize="xs" fontFamily="mono">
                          {formatNumber(parseFloat(project.targetAmountUSDC) - parseFloat(project.currentAmountUSDC), 8)} USDC
                        </Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="xs" color="yellow.600">Precise %:</Text>
                        <Text fontSize="xs" fontFamily="mono">{formatNumber(fundingProgress, 6)}%</Text>
                      </HStack>
                      <HStack justify="space-between">
                        <Text fontSize="xs" color="yellow.600">Completed:</Text>
                        <Text fontSize="xs" fontFamily="mono" color={isCompleted ? "green.600" : "red.600"}>
                          {isCompleted ? 'true' : 'false'}
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>
                )}
              </VStack>
            </Box>

            <Divider />

            {/* ✅ UPDATED Claim Status with precision-safe messaging */}
            {checkingEligibility ? (
              <Alert status="info" borderRadius="lg">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">Checking Eligibility...</AlertTitle>
                  <AlertDescription fontSize="sm">
                    Verifying if funds can be claimed using precision-safe calculations
                  </AlertDescription>
                </Box>
              </Alert>
            ) : canClaim ? (
              <Alert status="success" borderRadius="lg" bg={alertBg}>
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">Ready to Claim!</AlertTitle>
                  <AlertDescription fontSize="sm">
                    Your project is {isCompleted ? 'fully funded' : `${formatNumber(fundingProgress, 3)}% funded (nearly complete)`} and ready for fund release. 
                    You can now claim the raised USDC to your wallet.
                  </AlertDescription>
                </Box>
              </Alert>
            ) : project.fundsReleased ? (
              <Alert status="info" borderRadius="lg">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">Funds Already Released</AlertTitle>
                  <AlertDescription fontSize="sm">
                    Project funds have already been claimed on {' '}
                    {project.fundsReleasedAt && project.fundsReleasedAt !== '0' 
                      ? new Date(parseInt(project.fundsReleasedAt) * 1000).toLocaleDateString()
                      : 'a previous date'
                    }.
                  </AlertDescription>
                </Box>
              </Alert>
            ) : !isCompleted ? (
              <Alert status="warning" borderRadius="lg">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">Project Not Yet Completed</AlertTitle>
                  <AlertDescription fontSize="sm">
                    Your project needs to reach completion before you can claim the funds. 
                    Currently at {formatNumber(fundingProgress, 3)}% funding.
                    Need {formatNumber(parseFloat(project.targetAmountUSDC) - parseFloat(project.currentAmountUSDC), 6)} USDC more.
                  </AlertDescription>
                </Box>
              </Alert>
            ) : (
              <Alert status="warning" borderRadius="lg">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">Cannot Claim Funds</AlertTitle>
                  <AlertDescription fontSize="sm">
                    Funds cannot be claimed at this time. Please check project status.
                    Current funding: {formatNumber(fundingProgress, 3)}%
                  </AlertDescription>
                </Box>
              </Alert>
            )}

            {/* Claim Details */}
            {canClaim && (
              <Box p={4} bg="blue.50" borderRadius="lg" borderWidth="1px" borderColor="blue.200">
                <VStack spacing={3} align="stretch">
                  <Text fontWeight="bold" color="blue.700">
                    Fund Release Details
                  </Text>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="blue.600">Amount to Release:</Text>
                    <Text fontSize="sm" fontWeight="bold" color="blue.700">
                      {formatNumber(raisedAmount, 2)} USDC
                    </Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="blue.600">Platform Fee:</Text>
                    <Text fontSize="sm" color="blue.600">
                      Already deducted (1.5%)
                    </Text>
                  </HStack>
                  
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="blue.600">Net Amount:</Text>
                    <Text fontSize="lg" fontWeight="bold" color="blue.700">
                      {formatNumber(raisedAmount, 2)} USDC
                    </Text>
                  </HStack>
                  
                  <Text fontSize="xs" color="blue.600" mt={2}>
                    * Funds will be transferred directly to your connected wallet
                  </Text>
                  
                  {/* ✅ Add precision notice if not exactly 100% */}
                  {fundingProgress < 100 && isCompleted && (
                    <Alert status="info" size="sm" mt={2}>
                      <AlertIcon />
                      <Text fontSize="xs">
                        Note: Project is {formatNumber(fundingProgress, 4)}% funded. Small rounding differences from fees are normal and within acceptable tolerance.
                      </Text>
                    </Alert>
                  )}
                </VStack>
              </Box>
            )}

            {/* Next Steps */}
            {canClaim && (
              <Alert status="info" borderRadius="lg">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">After Claiming Funds</AlertTitle>
                  <AlertDescription fontSize="sm">
                    Remember to return profits to your investors according to your project plan. 
                    Use the "Deposit Returns" feature when your farming cycle is complete.
                  </AlertDescription>
                </Box>
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3} w="100%" justify="space-between">
            <Button variant="outline" onClick={onClose} isDisabled={claiming}>
              Cancel
            </Button>
            
            {canClaim ? (
              <Button
                colorScheme="green"
                leftIcon={<FaCheckCircle />}
                onClick={handleClaimFunds}
                isLoading={claiming}
                loadingText="Claiming Funds..."
                size="lg"
              >
                Claim {formatNumber(raisedAmount, 2)} USDC
              </Button>
            ) : (
              <Button
                colorScheme="gray"
                isDisabled={true}
                size="lg"
              >
                {project.fundsReleased ? 'Already Claimed' : 'Cannot Claim Yet'}
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default FundClaimModal;