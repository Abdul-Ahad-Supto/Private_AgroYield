// frontend/src/pages/Profile.js
import React, { useState, useEffect } from 'react';
import {
  Container,
  VStack,
  HStack,
  Box,
  Heading,
  Text,
  Avatar,
  Card,
  CardBody,
  CardHeader,
  Badge,
  Button,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useColorModeValue,
  Divider,
  Alert,
  AlertIcon,
  Spinner,
  Center
} from '@chakra-ui/react';
import { FaUser, FaSeedling, FaMoneyBillWave, FaEdit } from 'react-icons/fa';
import { useWeb3 } from '../contexts/Web3Context';
import { useContracts } from '../hooks/useContracts';

const Profile = () => {
  const { account, userProfile, isRegistered } = useWeb3();
  const { getUserProfile, getInvestorData } = useContracts();
  
  const [profileData, setProfileData] = useState(null);
  const [investorData, setInvestorData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.600', 'gray.300');

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!account || !isRegistered) return;
      
      try {
        setLoading(true);
        
        // Fetch user profile
        if (getUserProfile) {
          const profile = await getUserProfile(account);
          setProfileData(profile);
        }
        
        // Fetch investor data if available
        if (getInvestorData) {
          const investor = await getInvestorData(account);
          setInvestorData(investor);
        }
        
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [account, isRegistered, getUserProfile, getInvestorData]);

  if (!isRegistered) {
    return (
      <Container maxW="7xl" py={8}>
        <Center py={20}>
          <Alert status="warning" borderRadius="lg" maxW="md">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Registration Required</Text>
              <Text fontSize="sm">Please register your account to view your profile.</Text>
            </Box>
          </Alert>
        </Center>
      </Container>
    );
  }

  if (loading) {
    return (
      <Container maxW="7xl" py={8}>
        <Center py={20}>
          <VStack spacing={4}>
            <Spinner size="xl" color="brand.500" />
            <Text>Loading profile...</Text>
          </VStack>
        </Center>
      </Container>
    );
  }

  return (
    <Container maxW="7xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <Heading as="h1" size="xl" mb={2}>
            My Profile
          </Heading>
          <Text color={textColor}>
            Manage your account and view your activity on AgroYield
          </Text>
        </Box>

        {/* Profile Info Card */}
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardHeader>
            <HStack spacing={4}>
              <Avatar
                size="xl"
                name={userProfile?.name || 'User'}
                src=""
              />
              <Box>
                <Heading size="lg">{userProfile?.name || 'Anonymous User'}</Heading>
                <Text color={textColor} fontFamily="mono" fontSize="sm">
                  {account}
                </Text>
                <Badge colorScheme="green" mt={2}>
                  Verified User
                </Badge>
              </Box>
              <Button leftIcon={<FaEdit />} variant="outline" ml="auto">
                Edit Profile
              </Button>
            </HStack>
          </CardHeader>
          
          <CardBody pt={0}>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
              <Box>
                <Text fontSize="sm" color={textColor} mb={1}>
                  Member Since
                </Text>
                <Text fontWeight="medium">
                  {profileData?.registeredAt 
                    ? new Date(parseInt(profileData.registeredAt) * 1000).toLocaleDateString()
                    : 'N/A'
                  }
                </Text>
              </Box>
              
              <Box>
                <Text fontSize="sm" color={textColor} mb={1}>
                  Projects Created
                </Text>
                <Text fontWeight="medium">
                  {profileData?.projectCount || '0'}
                </Text>
              </Box>
              
              <Box>
                <Text fontSize="sm" color={textColor} mb={1}>
                  Total Invested
                </Text>
                <Text fontWeight="medium">
                  {profileData?.totalInvested ? `${profileData.totalInvested} USDC` : '0 USDC'}
                </Text>
              </Box>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Stats Grid */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
          <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Total Invested</StatLabel>
                <StatNumber>
                  {investorData?.totalInvested ? `${investorData.totalInvested} USDC` : '0 USDC'}
                </StatNumber>
                <StatHelpText>Across all projects</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Active Investments</StatLabel>
                <StatNumber>{investorData?.activeInvestments || '0'}</StatNumber>
                <StatHelpText>Currently funding</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Returns Claimed</StatLabel>
                <StatNumber>
                  {investorData?.claimedReturns ? `${investorData.claimedReturns} USDC` : '0 USDC'}
                </StatNumber>
                <StatHelpText>Total earnings</StatHelpText>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
            <CardBody>
              <Stat>
                <StatLabel>Pending Returns</StatLabel>
                <StatNumber>
                  {investorData?.pendingAmount ? `${investorData.pendingAmount} USDC` : '0 USDC'}
                </StatNumber>
                <StatHelpText>Ready to claim</StatHelpText>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Quick Actions */}
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Quick Actions</Heading>
          </CardHeader>
          <CardBody>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
              <Button
                leftIcon={<FaSeedling />}
                colorScheme="brand"
                variant="outline"
                height="60px"
                onClick={() => window.location.href = '/create-project'}
              >
                Create New Project
              </Button>
              
              <Button
                leftIcon={<FaMoneyBillWave />}
                colorScheme="green"
                variant="outline"
                height="60px"
                onClick={() => window.location.href = '/projects'}
              >
                Browse Projects
              </Button>
              
              <Button
                leftIcon={<FaUser />}
                colorScheme="purple"
                variant="outline"
                height="60px"
                onClick={() => window.location.href = '/governance'}
              >
                View Governance
              </Button>
            </SimpleGrid>
          </CardBody>
        </Card>

        {/* Account Security */}
        <Card bg={cardBg} borderWidth="1px" borderColor={borderColor}>
          <CardHeader>
            <Heading size="md">Account Security</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <HStack justify="space-between">
                <Box>
                  <Text fontWeight="medium">Wallet Address</Text>
                  <Text fontSize="sm" color={textColor} fontFamily="mono">
                    {account}
                  </Text>
                </Box>
                <Badge colorScheme="green">Connected</Badge>
              </HStack>
              
              <Divider />
              
              <HStack justify="space-between">
                <Box>
                  <Text fontWeight="medium">Registration Status</Text>
                  <Text fontSize="sm" color={textColor}>
                    Your account is verified on the blockchain
                  </Text>
                </Box>
                <Badge colorScheme="green">Verified</Badge>
              </HStack>
              
              <Divider />
              
              <HStack justify="space-between">
                <Box>
                  <Text fontWeight="medium">Profile Data</Text>
                  <Text fontSize="sm" color={textColor}>
                    Stored securely on IPFS
                  </Text>
                </Box>
                <Badge colorScheme="blue">Decentralized</Badge>
              </HStack>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Container>
  );
};

export default Profile;