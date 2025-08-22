// frontend/src/components/FarmerReturnDepositModal.js
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
  Progress,
  FormControl,
  FormLabel,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Textarea,
  Select
} from '@chakra-ui/react';
import { FaCoins, FaClock, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { useContracts } from '../hooks/useContracts';
import { useWeb3 } from '../contexts/Web3Context';
import { ethers } from 'ethers';

const FarmerReturnDepositModal = ({ isOpen, onClose, project, onSuccess }) => {
  const [returnAmount, setReturnAmount] = useState('');
  const [depositType, setDepositType] = useState('principal_plus_return'); // 'principal_only', 'principal_plus_return', 'custom'
  const [notes, setNotes] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [projectReturnDetails, setProjectReturnDetails] = useState(null);
  const [ethBalance, setEthBalance] = useState('0');
  
  const { depositProjectReturns, contracts } = useContracts();
  const { account, getBalance } = useWeb3();
  const toast = useToast();
  
  // Color mode values
  const alertBg = useColorModeValue('green.50', 'green.900');
  const statBg = useColorModeValue('gray.50', 'gray.700');

  // Fetch project return details and ETH balance
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !project?.id || !contracts.investmentManager) return;
      
      try {
        // Get project return details
        const details = await contracts.investmentManager.getProjectReturnDetails(project.id);
        setProjectReturnDetails({
          totalPrincipal: ethers.utils.formatUnits(details.totalPrincipal, 6),
          expectedReturnAmount: ethers.utils.formatUnits(details.expectedReturnAmount, 6),
          actualReturnDeposited: ethers.utils.formatUnits(details.actualReturnDeposited, 6),
          returnDueDate: details.returnDueDate.toString(),
          farmerDeposited: details.farmerDeposited,
          distributionCompleted: details.distributionCompleted,
          claimedAmount: ethers.utils.formatUnits(details.claimedAmount, 6),
          investorCount: details.investorCount.toString()
        });
        
        // Get ETH balance
        if (getBalance) {
          const balance = await getBalance(account);
          setEthBalance(balance);
        }
        
      } catch (error) {
        console.error('Error fetching return data:', error);
      }
    };

    fetchData();
  }, [isOpen, project?.id, contracts.investmentManager, account, getBalance]);

  // Calculate suggested amounts based on deposit type
  useEffect(() => {
    if (!projectReturnDetails) return;
    
    const principal = parseFloat(projectReturnDetails.totalPrincipal);
    const expectedReturn = parseFloat(projectReturnDetails.expectedReturnAmount);
    
    switch (depositType) {
      case 'principal_only':
        setReturnAmount(principal.toFixed(6));
        break;
      case 'principal_plus_return':
        setReturnAmount((principal + expectedReturn).toFixed(6));
        break;
      case 'custom':
        // Don't auto-set for custom
        break;
      default:
        break;
    }
  }, [depositType, projectReturnDetails]);

  const handleDeposit = async () => {
    if (!project?.id || !depositProjectReturns || !returnAmount) return;

    try {
      setIsDepositing(true);
      
      const amountETH = parseFloat(returnAmount);
      
      // Validate amount
      if (amountETH <= 0) {
        throw new Error('Return amount must be greater than 0');
      }
      
      if (amountETH > parseFloat(ethBalance)) {
        throw new Error('Insufficient ETH balance');
      }
      
      // Check minimum amount (should at least return principal)
      const minAmount = parseFloat(projectReturnDetails.totalPrincipal);
      if (amountETH < minAmount) {
        throw new Error(`Minimum return amount is ${minAmount.toFixed(6)} ETH (principal amount)`);
      }
      
      console.log('🔍 Depositing returns:', {
        projectId: project.id,
        amount: amountETH,
        type: depositType,
        notes
      });
      
      await depositProjectReturns(project.id, amountETH);
      
      toast({
        title: 'Returns Deposited Successfully',
        description: `${amountETH} ETH deposited as returns for investors`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      // Reset form
      setReturnAmount('');
      setDepositType('principal_plus_return');
      setNotes('');
      
      if (onSuccess) onSuccess();
      onClose();
      
    } catch (error) {
      console.error('❌ Return deposit error:', error);
      toast({
        title: 'Return Deposit Failed',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsDepositing(false);
    }
  };

  const formatNumber = (num, decimals = 2) => {
    return parseFloat(num).toFixed(decimals);
  };

  const getDaysUntilDue = () => {
    if (!projectReturnDetails?.returnDueDate) return null;
    
    const dueDate = new Date(parseInt(projectReturnDetails.returnDueDate) * 1000);
    const now = new Date();
    const diffTime = dueDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const isOverdue = () => {
    const daysUntil = getDaysUntilDue();
    return daysUntil !== null && daysUntil < 0;
  };

  if (!project || !projectReturnDetails) {
    return null;
  }

  const daysUntilDue = getDaysUntilDue();
  const overdue = isOverdue();
  const principal = parseFloat(projectReturnDetails.totalPrincipal);
  const expectedReturn = parseFloat(projectReturnDetails.expectedReturnAmount);
  const totalExpected = principal + expectedReturn;
  const returnRate = principal > 0 ? (expectedReturn / principal) * 100 : 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack spacing={3}>
            <FaCoins color="#38A169" />
            <Text>Deposit Project Returns</Text>
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
                  Return Deposit
                </Badge>
                {overdue && (
                  <Badge colorScheme="red" px={3} py={1} borderRadius="full">
                    {Math.abs(daysUntilDue)} Days Overdue
                  </Badge>
                )}
              </HStack>
            </Box>

            {/* Return Summary */}
            <Box p={4} bg={statBg} borderRadius="lg">
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" color="gray.500">Total Principal</Text>
                    <Text fontSize="xl" fontWeight="bold" color="blue.500">
                      {formatNumber(principal, 6)} ETH
                    </Text>
                  </VStack>
                  
                  <VStack align="center" spacing={0}>
                    <Text fontSize="sm" color="gray.500">Expected Return</Text>
                    <Text fontSize="xl" fontWeight="bold" color="green.500">
                      {formatNumber(expectedReturn, 6)} ETH
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      ({formatNumber(returnRate, 1)}% return)
                    </Text>
                  </VStack>
                  
                  <VStack align="end" spacing={0}>
                    <Text fontSize="sm" color="gray.500">Total Expected</Text>
                    <Text fontSize="xl" fontWeight="bold" color="purple.500">
                      {formatNumber(totalExpected, 6)} ETH
                    </Text>
                  </VStack>
                </HStack>

                <Divider />

                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.500">Investors:</Text>
                  <Text fontSize="sm" fontWeight="bold">{projectReturnDetails.investorCount}</Text>
                </HStack>

                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.500">Due Date:</Text>
                  <HStack>
                    {overdue ? <FaExclamationTriangle color="red" /> : <FaClock color="orange" />}
                    <Text fontSize="sm" color={overdue ? "red.500" : "orange.500"}>
                      {daysUntilDue !== null ? (
                        overdue ? 
                          `${Math.abs(daysUntilDue)} days overdue` : 
                          `${daysUntilDue} days remaining`
                      ) : 'Not set'}
                    </Text>
                  </HStack>
                </HStack>
              </VStack>
            </Box>

            {/* Status Check */}
            {projectReturnDetails.farmerDeposited ? (
              <Alert status="info" borderRadius="lg">
                <AlertIcon />
                <Box>
                  <AlertTitle fontSize="sm">Returns Already Deposited</AlertTitle>
                  <AlertDescription fontSize="sm">
                    You have already deposited {formatNumber(parseFloat(projectReturnDetails.actualReturnDeposited), 6)} ETH 
                    for this project.
                  </AlertDescription>
                </Box>
              </Alert>
            ) : (
              <>
                {/* Deposit Type Selection */}
                <FormControl>
                  <FormLabel>Deposit Type</FormLabel>
                  <Select 
                    value={depositType} 
                    onChange={(e) => setDepositType(e.target.value)}
                  >
                    <option value="principal_only">Principal Only ({formatNumber(principal, 6)} ETH)</option>
                    <option value="principal_plus_return">Principal + Expected Return ({formatNumber(totalExpected, 6)} ETH)</option>
                    <option value="custom">Custom Amount</option>
                  </Select>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Select how much you want to return to investors
                  </Text>
                </FormControl>

                {/* Return Amount Input */}
                <FormControl>
                  <FormLabel>Return Amount (ETH)</FormLabel>
                  <NumberInput 
                    min={principal} 
                    precision={6}
                    value={returnAmount}
                    onChange={setReturnAmount}
                  >
                    <NumberInputField placeholder="Enter return amount in ETH" />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    Minimum: {formatNumber(principal, 6)} ETH (principal amount)
                  </Text>
                </FormControl>

                {/* Balance Check */}
                <Box p={3} bg="blue.50" borderRadius="md">
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="blue.600">Your ETH Balance:</Text>
                    <Text fontSize="sm" fontWeight="bold" color="blue.700">
                      {formatNumber(parseFloat(ethBalance), 6)} ETH
                    </Text>
                  </HStack>
                  {parseFloat(returnAmount) > parseFloat(ethBalance) && (
                    <Text fontSize="xs" color="red.500" mt={1}>
                      Insufficient ETH balance
                    </Text>
                  )}
                </Box>

                {/* Return Breakdown */}
                {returnAmount && parseFloat(returnAmount) >= principal && (
                  <Box p={4} bg="green.50" borderRadius="lg" borderWidth="1px" borderColor="green.200">
                    <Text fontWeight="bold" color="green.700" mb={3}>
                      Return Breakdown
                    </Text>
                    
                    <VStack spacing={2} align="stretch">
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="green.600">Principal Return:</Text>
                        <Text fontSize="sm" fontWeight="bold" color="green.700">
                          {formatNumber(principal, 6)} ETH
                        </Text>
                      </HStack>
                      
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="green.600">Profit Return:</Text>
                        <Text fontSize="sm" fontWeight="bold" color="green.700">
                          {formatNumber(Math.max(0, parseFloat(returnAmount) - principal), 6)} ETH
                        </Text>
                      </HStack>
                      
                      <Divider />
                      
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="green.600">Total Return:</Text>
                        <Text fontSize="lg" fontWeight="bold" color="green.700">
                          {formatNumber(parseFloat(returnAmount), 6)} ETH
                        </Text>
                      </HStack>

                      <HStack justify="space-between">
                        <Text fontSize="sm" color="green.600">Actual Return Rate:</Text>
                        <Text fontSize="sm" fontWeight="bold" color="green.700">
                          {formatNumber(((parseFloat(returnAmount) - principal) / principal) * 100, 2)}%
                        </Text>
                      </HStack>
                    </VStack>
                    
                    <Text fontSize="xs" color="green.600" mt={3}>
                      * Returns will be distributed proportionally among {projectReturnDetails.investorCount} investors
                    </Text>
                  </Box>
                )}

                {/* Notes */}
                <FormControl>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any notes about the harvest results, challenges faced, or additional information for investors..."
                    rows={3}
                    maxLength={500}
                  />
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    {notes.length}/500 characters
                  </Text>
                </FormControl>

                {/* Overdue Warning */}
                {overdue && (
                  <Alert status="warning" borderRadius="lg">
                    <AlertIcon />
                    <Box>
                      <AlertTitle fontSize="sm">Returns Overdue!</AlertTitle>
                      <AlertDescription fontSize="sm">
                        Your returns are {Math.abs(daysUntilDue)} days overdue. 
                        Late penalties may apply according to the platform terms.
                      </AlertDescription>
                    </Box>
                  </Alert>
                )}

                {/* Important Notice */}
                <Alert status="info" borderRadius="lg">
                  <AlertIcon />
                  <Box>
                    <AlertTitle fontSize="sm">Important Notice</AlertTitle>
                    <AlertDescription fontSize="sm">
                      Once you deposit returns, they will be automatically distributed to investors 
                      proportionally based on their investment amounts. This action cannot be undone.
                    </AlertDescription>
                  </Box>
                </Alert>
              </>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack spacing={3} w="100%" justify="space-between">
            <Button variant="outline" onClick={onClose} isDisabled={isDepositing}>
              Cancel
            </Button>
            
            {projectReturnDetails.farmerDeposited ? (
              <Button colorScheme="gray" isDisabled={true} size="lg">
                Returns Already Deposited
              </Button>
            ) : (
              <Button
                colorScheme="green"
                leftIcon={<FaCheckCircle />}
                onClick={handleDeposit}
                isLoading={isDepositing}
                loadingText="Depositing Returns..."
                size="lg"
                isDisabled={
                  !returnAmount || 
                  parseFloat(returnAmount) < principal ||
                  parseFloat(returnAmount) > parseFloat(ethBalance)
                }
              >
                Deposit {returnAmount ? formatNumber(parseFloat(returnAmount), 6) : '0'} ETH
              </Button>
            )}
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default FarmerReturnDepositModal;