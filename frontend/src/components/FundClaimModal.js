// frontend/src/components/FundClaimModal.js - FIXED with 99.99% tolerance
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

const FundClaimModal = ({ isOpen, onClose, project, onSuccess }) => {
  const [canClaim, setCanClaim] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);
  
  const { claimProjectFunds, canClaimFunds } = useContracts();
  const toast = useToast();
  
  // Color mode values
  const alertBg = useColorModeValue('green.50', 'green.900');
  const statBg = useColorModeValue('gray.50', 'gray.700');

  // ✅ UPDATED - Check if funds can be claimed with 99.99% tolerance
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
          } catch (error) {
            console.log('Smart contract canClaimFunds failed:', error);
          }
        }
        
        // ✅ If smart contract says no, check if 99.99%+ funded (rounding tolerance)
        if (!eligible && project) {
          const fundingProgress = project.targetAmountUSDC > 0 
            ? (parseFloat(project.currentAmountUSDC) / parseFloat(project.targetAmountUSDC)) * 100 
            : 0;
          
          const isNearlyComplete = fundingProgress >= 99.99;
          const isNotReleased = !project.fundsReleased;
          eligible = isNearlyComplete && isNotReleased;
          
          if (eligible) {
            console.log('✅ FundClaimModal: Allowing claim due to 99.99%+ funding', {
              fundingProgress,
              fundsReleased: project.fundsReleased
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

  const fundingProgress = project.targetAmountUSDC > 0 
    ? (parseFloat(project.currentAmountUSDC) / parseFloat(project.targetAmountUSDC)) * 100 
    : 0;

  // ✅ UPDATED - Consider 99.99%+ as completed (handles rounding)
  const isCompleted = fundingProgress >= 99.99;
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
                    {fundingProgress.toFixed(2)}%
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
                      {raisedAmount.toFixed(2)} USDC
                    </Text>
                  </VStack>
                  
                  <VStack align="end" spacing={0}>
                    <Text fontSize="sm" color="gray.500">Target</Text>
                    <Text fontSize="xl" fontWeight="bold">
                      {parseFloat(project.targetAmountUSDC || '0').toFixed(2)} USDC
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
              </VStack>
            </Box>

            <Divider />

            {/* ✅ UPDATED Claim Status with better messaging */}
            {checkingEligibility ? (
              <Alert status="info" borderRadius="lg">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">Checking Eligibility...</AlertTitle>
                  <AlertDescription fontSize="sm">
                    Verifying if funds can be claimed
                  </AlertDescription>
                </Box>
              </Alert>
            ) : canClaim ? (
              <Alert status="success" borderRadius="lg" bg={alertBg}>
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">Ready to Claim!</AlertTitle>
                  <AlertDescription fontSize="sm">
                    Your project is {fundingProgress >= 100 ? 'fully funded' : `${fundingProgress.toFixed(2)}% funded (nearly complete)`} and ready for fund release. 
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
                    Your project needs to reach 99.99% funding before you can claim the funds. 
                    Currently at {fundingProgress.toFixed(2)}% funding.
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
                    Current funding: {fundingProgress.toFixed(2)}%
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
                      {raisedAmount.toFixed(2)} USDC
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
                      {raisedAmount.toFixed(2)} USDC
                    </Text>
                  </HStack>
                  
                  <Text fontSize="xs" color="blue.600" mt={2}>
                    * Funds will be transferred directly to your connected wallet
                  </Text>
                  
                  {/* ✅ Add rounding notice if not exactly 100% */}
                  {fundingProgress < 100 && fundingProgress >= 99.99 && (
                    <Alert status="info" size="sm" mt={2}>
                      <AlertIcon />
                      <Text fontSize="xs">
                        Note: Project is {fundingProgress.toFixed(3)}% funded. Small rounding differences from fees are normal.
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
                Claim {raisedAmount.toFixed(2)} USDC
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