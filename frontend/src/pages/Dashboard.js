// frontend/src/pages/Dashboard.js - CLEAN VERSION - Real Data Only
import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  SimpleGrid, 
  Card, 
  CardHeader, 
  CardBody, 
  CardFooter, 
  Button, 
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Progress,
  Badge,
  Divider,
  HStack,
  VStack,
  Spinner,
  Center,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { FaSeedling, FaMoneyBillWave, FaChartLine, FaWallet, FaUser } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useWeb3 } from '../contexts/Web3Context';
import { useContracts } from '../hooks/useContracts';

const Dashboard = () => {
  const navigate = useNavigate();
  const { account, isConnected, isRegistered } = useWeb3();
  const { getInvestorData, getUSDCBalance, getAllProjects, getPlatformStats } = useContracts();
  
  // All color mode values - MUST be called before any conditional returns
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.500', 'gray.400');
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.400');
  const headerTextColor = useColorModeValue('gray.600', 'gray.400');
  
  // State management
  const [investorData, setInvestorData] = useState(null);
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [userProjects, setUserProjects] = useState([]);
  const [platformStats, setPlatformStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isConnected || !account) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch investor data
        if (getInvestorData) {
          try {
            const data = await getInvestorData(account);
            setInvestorData(data);
          } catch (err) {
            console.warn('Could not fetch investor data:', err);
          }
        }

        // Fetch USDC balance
        if (getUSDCBalance) {
          try {
            const balance = await getUSDCBalance(account);
            setUsdcBalance(balance);
          } catch (err) {
            console.warn('Could not fetch USDC balance:', err);
          }
        }

        // Fetch user's projects (if farmer)
        if (getAllProjects) {
          try {
            const allProjects = await getAllProjects();
            const myProjects = allProjects.filter(project => 
              project.farmer.toLowerCase() === account.toLowerCase()
            );
            setUserProjects(myProjects);
          } catch (err) {
            console.warn('Could not fetch projects:', err);
          }
        }

        // Fetch platform stats
        if (getPlatformStats) {
          try {
            const stats = await getPlatformStats();
            setPlatformStats(stats);
          } catch (err) {
            console.warn('Could not fetch platform stats:', err);
          }
        }

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [isConnected, account, getInvestorData, getUSDCBalance, getAllProjects, getPlatformStats]);

  // Loading state
  if (loading) {
    return (
      <Container maxW="7xl" py={8}>
        <Center py={20}>
          <VStack spacing={4}>
            <Spinner size="xl" color="brand.500" />
            <Text>Loading dashboard...</Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  // Not connected state
  if (!isConnected) {
    return (
      <Container maxW="7xl" py={8}>
        <Center py={20}>
          <Alert status="warning" borderRadius="lg" maxW="md">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Wallet Not Connected</Text>
              <Text fontSize="sm">Please connect your wallet to view your dashboard.</Text>
            </Box>
          </Alert>
        </Center>
      </Container>
    );
  }

  // Not registered state
  if (!isRegistered) {
    return (
      <Container maxW="7xl" py={8}>
        <Center py={20}>
          <Alert status="info" borderRadius="lg" maxW="md">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Registration Required</Text>
              <Text fontSize="sm">Please register your account to access the dashboard.</Text>
            </Box>
          </Alert>
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="7xl" py={8}>
      <Stack spacing={8}>
        {/* Header */}
        <Box>
          <Heading as="h1" size="xl" mb={2}>
            Dashboard
          </Heading>
          <Text color={headerTextColor}>
            Welcome back! Here's an overview of your activity.
          </Text>
        </Box>
        
        {/* Stats Grid */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
          {/* USDC Balance */}
          <Card bg={cardBg} boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
            <CardBody>
              <HStack justifyContent="space-between" mb={4}>
                <Box p={3} bg="brand.50" borderRadius="lg" color="brand.500">
                  <FaWallet size={24} />
                </Box>
              </HStack>
              <Stat>
                <StatLabel color={secondaryTextColor}>USDC Balance</StatLabel>
                <StatNumber fontSize="2xl" my={1}>
                  {parseFloat(usdcBalance).toFixed(2)} USDC
                </StatNumber>
                <StatHelpText mb={0} color={textColor}>
                  Available to invest
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          {/* Total Invested */}
          <Card bg={cardBg} boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
            <CardBody>
              <HStack justifyContent="space-between" mb={4}>
                <Box p={3} bg="green.50" borderRadius="lg" color="green.500">
                  <FaMoneyBillWave size={24} />
                </Box>
              </HStack>
              <Stat>
                <StatLabel color={secondaryTextColor}>Total Invested</StatLabel>
                <StatNumber fontSize="2xl" my={1}>
                  {investorData ? `${parseFloat(investorData.totalInvested).toFixed(2)} USDC` : '0 USDC'}
                </StatNumber>
                <StatHelpText mb={0} color={textColor}>
                  Across all projects
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          {/* Active Investments */}
          <Card bg={cardBg} boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
            <CardBody>
              <HStack justifyContent="space-between" mb={4}>
                <Box p={3} bg="blue.50" borderRadius="lg" color="blue.500">
                  <FaSeedling size={24} />
                </Box>
              </HStack>
              <Stat>
                <StatLabel color={secondaryTextColor}>Active Investments</StatLabel>
                <StatNumber fontSize="2xl" my={1}>
                  {investorData ? investorData.activeInvestments : '0'}
                </StatNumber>
                <StatHelpText mb={0} color={textColor}>
                  Currently funding
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          {/* Returns Claimed */}
          <Card bg={cardBg} boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
            <CardBody>
              <HStack justifyContent="space-between" mb={4}>
                <Box p={3} bg="purple.50" borderRadius="lg" color="purple.500">
                  <FaChartLine size={24} />
                </Box>
              </HStack>
              <Stat>
                <StatLabel color={secondaryTextColor}>Returns Claimed</StatLabel>
                <StatNumber fontSize="2xl" my={1}>
                  {investorData ? `${parseFloat(investorData.claimedReturns).toFixed(2)} USDC` : '0 USDC'}
                </StatNumber>
                <StatHelpText mb={0} color={textColor}>
                  Total earnings
                </StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>
        
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          {/* My Projects (if farmer) */}
          <Card bg={cardBg} boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
            <CardHeader pb={2}>
              <Heading size="md">My Projects</Heading>
            </CardHeader>
            <CardBody pt={0}>
              {userProjects.length > 0 ? (
                <Stack spacing={4}>
                  {userProjects.slice(0, 3).map((project) => (
                    <Box key={project.id}>
                      <HStack justifyContent="space-between" mb={1}>
                        <Text fontWeight="medium" noOfLines={1}>
                          {project.title}
                        </Text>
                        <Badge 
                          colorScheme={project.status === 0 ? 'green' : project.status === 1 ? 'purple' : 'red'}
                          variant="subtle"
                          borderRadius="full"
                          px={2}
                        >
                          {project.status === 0 ? 'Active' : project.status === 1 ? 'Completed' : 'Cancelled'}
                        </Badge>
                      </HStack>
                      <HStack justifyContent="space-between" color={secondaryTextColor}>
                        <Text fontSize="sm">
                          Target: {parseFloat(project.targetAmountUSDC).toFixed(2)} USDC
                        </Text>
                        <Text fontSize="sm">
                          Raised: {parseFloat(project.currentAmountUSDC).toFixed(2)} USDC
                        </Text>
                      </HStack>
                      <Progress 
                        value={(parseFloat(project.currentAmountUSDC) / parseFloat(project.targetAmountUSDC)) * 100} 
                        size="sm" 
                        colorScheme="brand" 
                        mt={2}
                        borderRadius="full"
                      />
                      <Divider my={2} />
                    </Box>
                  ))}
                </Stack>
              ) : (
                <VStack py={8} color={textColor}>
                  <FaSeedling size={32} />
                  <Text>No projects created yet</Text>
                  <Text fontSize="sm" textAlign="center">
                    Create your first project to start raising funds
                  </Text>
                </VStack>
              )}
            </CardBody>
            <CardFooter pt={0}>
              <Button 
                variant="link" 
                colorScheme="brand"
                onClick={() => navigate('/create-project')}
              >
                {userProjects.length > 0 ? 'View all projects' : 'Create your first project'}
              </Button>
            </CardFooter>
          </Card>
          
          {/* Platform Statistics */}
          <Card bg={cardBg} boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
            <CardHeader pb={2}>
              <Heading size="md">Platform Overview</Heading>
            </CardHeader>
            <CardBody pt={0}>
              {platformStats ? (
                <Stack spacing={4}>
                  <HStack justify="space-between">
                    <Text color={secondaryTextColor}>Total Projects:</Text>
                    <Text fontWeight="bold">{platformStats.totalProjects}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color={secondaryTextColor}>Total Users:</Text>
                    <Text fontWeight="bold">{platformStats.totalUsers}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color={secondaryTextColor}>Total Funding:</Text>
                    <Text fontWeight="bold">{parseFloat(platformStats.totalFunding).toFixed(2)} USDC</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color={secondaryTextColor}>Total Investments:</Text>
                    <Text fontWeight="bold">{platformStats.totalInvestments}</Text>
                  </HStack>
                </Stack>
              ) : (
                <VStack py={8} color={textColor}>
                  <Text>Platform statistics unavailable</Text>
                </VStack>
              )}
            </CardBody>
          </Card>
        </SimpleGrid>
        
        {/* Quick Actions */}
        <Card bg={cardBg} boxShadow="sm" borderWidth="1px" borderColor={borderColor}>
          <CardHeader pb={2}>
            <Heading size="md">Quick Actions</Heading>
          </CardHeader>
          <CardBody pt={0}>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <Button 
                colorScheme="brand" 
                variant="outline" 
                leftIcon={<FaSeedling />}
                height="80px"
                whiteSpace="normal"
                textAlign="center"
                py={4}
                onClick={() => navigate('/projects')}
              >
                Browse Projects
              </Button>
              
              <Button 
                colorScheme="green" 
                variant="outline" 
                leftIcon={<FaMoneyBillWave />}
                height="80px"
                whiteSpace="normal"
                textAlign="center"
                py={4}
                onClick={() => navigate('/create-project')}
              >
                Create Project
              </Button>
              
              <Button 
                colorScheme="purple" 
                variant="outline" 
                leftIcon={<FaUser />}
                height="80px"
                whiteSpace="normal"
                textAlign="center"
                py={4}
                onClick={() => navigate('/profile')}
              >
                View Profile
              </Button>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Pending Returns */}
        {investorData && parseFloat(investorData.pendingAmount) > 0 && (
          <Alert status="success" borderRadius="lg">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Pending Returns Available</Text>
              <Text fontSize="sm">
                You have {parseFloat(investorData.pendingAmount).toFixed(2)} USDC in pending returns ready to claim.
              </Text>
            </Box>
          </Alert>
        )}
      </Stack>
    </Container>
  );
};

export default Dashboard;