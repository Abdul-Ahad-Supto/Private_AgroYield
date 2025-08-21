// frontend/src/pages/Projects.js - FIXED VERSION - Stop Infinite Loops
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  SimpleGrid, 
  Card, 
  CardBody, 
  CardFooter, 
  Button, 
  Text, 
  Badge,
  Stack,
  useColorModeValue,
  Progress,
  HStack,
  VStack,
  Avatar,
  Alert,
  AlertIcon,
  Input,
  Select,
  Icon,
  useToast,
  InputGroup,
  InputLeftElement,
  Skeleton,
  SkeletonText,
  Center,
  Image
} from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { 
  FaSeedling, 
  FaClock, 
  FaMapMarkerAlt, 
  FaUser,
  FaSearch,
  FaChartLine,
  FaLeaf,
  FaAppleAlt,
  FaCarrot,
  FaExclamationTriangle,
  FaEye,
  FaTractor,
  FaFish
} from 'react-icons/fa';
import { useWeb3 } from '../contexts/Web3Context';
import { useContracts } from '../hooks/useContracts';
import CORSSafeImage from '../components/CORSSafeImage';

const Projects = () => {
  // State management
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState(null);
  
  // Prevent multiple simultaneous fetches
  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  
  const { isConnected } = useWeb3();
  const { getAllProjects, contractsReady } = useContracts();
  const toast = useToast();
  
  // Color mode values
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const secondaryTextColor = useColorModeValue('gray.500', 'gray.400');
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  // Memoized utility functions to prevent recreations
  const calculateDaysLeft = useCallback((endTimestamp) => {
    if (!endTimestamp || endTimestamp === '0') return 'N/A';
    try {
      const endDate = new Date(parseInt(endTimestamp) * 1000);
      const now = new Date();
      const diffTime = endDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch (error) {
      return 'N/A';
    }
  }, []);

  const getProjectStatus = useCallback((statusCode) => {
    const statuses = {
      0: 'Active',
      1: 'Completed', 
      2: 'Cancelled'
    };
    return statuses[statusCode] || 'Unknown';
  }, []);

  const getStatusColor = useCallback((status) => {
    const colors = {
      'Active': 'green',
      'Completed': 'purple',
      'Cancelled': 'red'
    };
    return colors[status] || 'gray';
  }, []);

  const getCategoryIcon = useCallback((category) => {
    const icons = {
      'Rice Cultivation': FaSeedling,
      'Fruit Cultivation': FaAppleAlt,
      'Vegetable Cultivation': FaCarrot,
      'Livestock': FaTractor,
      'Fisheries': FaFish,
      'Agroforestry': FaLeaf,
      'Poultry': FaUser,
      'Dairy Farming': FaUser
    };
    return icons[category] || FaSeedling;
  }, []);

  const formatFarmerAddress = useCallback((address) => {
    if (!address) return 'Unknown';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }, []);

  // FIXED: Stable fetch function with proper dependencies
  const fetchProjects = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (fetchingRef.current || !isConnected || !contractsReady || !getAllProjects) {
      console.log('⏭️ Skipping fetch - already fetching or not ready');
      return;
    }
    
    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching projects from blockchain...');
      const projectsData = await getAllProjects();
      
      // Check if component is still mounted
      if (!mountedRef.current) return;
      
      if (!projectsData || projectsData.length === 0) {
        console.log('📭 No projects found');
        setProjects([]);
        return;
      }

      // Process blockchain data with stable keys
      const processedProjects = projectsData.map((project, index) => ({
        ...project,
        daysLeft: calculateDaysLeft(project.deadline),
        status: getProjectStatus(project.status),
        farmerFormatted: formatFarmerAddress(project.farmer),
        // Use combination of ID and index for stability
        stableKey: `${project.id}-${index}`,
        // Add timestamp to prevent stale data
        fetchedAt: Date.now()
      }));

      setProjects(processedProjects);
      console.log('✅ Projects loaded:', processedProjects.length);
      
    } catch (error) {
      console.error('❌ Error fetching projects:', error);
      if (mountedRef.current) {
        setError('Failed to load projects from blockchain.');
        toast({
          title: 'Error Loading Projects',
          description: 'Failed to fetch projects from blockchain.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [
    isConnected, 
    contractsReady,
    getAllProjects, 
    calculateDaysLeft, 
    getProjectStatus, 
    formatFarmerAddress, 
    toast
  ]);

  // FIXED: Single effect with stable dependencies
  useEffect(() => {
    mountedRef.current = true;
    
    if (isConnected && contractsReady && getAllProjects) {
      fetchProjects();
    } else {
      setLoading(false);
    }

    // Cleanup
    return () => {
      mountedRef.current = false;
      fetchingRef.current = false;
    };
  }, [isConnected, contractsReady, getAllProjects]); // Added contractsReady

  // FIXED: Stable filtered projects with useMemo
  const filteredProjects = useMemo(() => {
    let filtered = [...projects]; // Create a copy to avoid mutations

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(project =>
        project.title?.toLowerCase().includes(searchLower) ||
        project.description?.toLowerCase().includes(searchLower) ||
        project.location?.toLowerCase().includes(searchLower)
      );
    }

    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(project => project.category === categoryFilter);
    }

    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    return filtered;
  }, [projects, searchTerm, categoryFilter, statusFilter]);

  // FIXED: Stable Project Card with React.memo
  const ProjectCard = React.memo(({ project }) => {
    const CategoryIcon = getCategoryIcon(project.category);
    
    // Memoize calculations
    const fundedUSDC = useMemo(() => parseFloat(project.currentAmountUSDC || '0'), [project.currentAmountUSDC]);
    const targetUSDC = useMemo(() => parseFloat(project.targetAmountUSDC || '1'), [project.targetAmountUSDC]);
    const fundingProgress = useMemo(() => 
      targetUSDC > 0 ? Math.min((fundedUSDC / targetUSDC) * 100, 100) : 0, 
      [fundedUSDC, targetUSDC]
    );

    return (
      <Card 
        bg={cardBg}
        boxShadow="md"
        overflow="hidden"
        borderWidth="1px"
        borderColor={borderColor}
        position="relative"
        borderRadius="xl"
        transition="transform 0.2s ease, box-shadow 0.2s ease"
        _hover={{
          transform: 'translateY(-4px)',
          boxShadow: 'xl'
        }}
      >
        {/* Project Image */}
        <Box height="200px" position="relative" overflow="hidden">
          <CORSSafeImage
            ipfsHash={project.imageIPFSHash}
            category={project.category}
            alt={project.title}
            width="100%"
            height="100%"
            objectFit="cover"
            loading={false} // Prevent loading state loops
          />
          
          {/* Status badge */}
          <Badge 
            position="absolute" 
            top={3} 
            right={3} 
            colorScheme={getStatusColor(project.status)}
            px={3}
            py={1}
            borderRadius="full"
            fontWeight="bold"
            boxShadow="md"
          >
            {project.status}
          </Badge>
          
          {/* Category icon overlay */}
          <Box
            position="absolute"
            top={3}
            left={3}
            bg="whiteAlpha.900"
            p={2}
            borderRadius="full"
            boxShadow="md"
          >
            <Icon as={CategoryIcon} color="brand.500" boxSize={4} />
          </Box>
        </Box>
        
        {/* Card content */}
        <CardBody pb={3}>
          <Heading size="md" mb={2} noOfLines={2} lineHeight="shorter">
            {project.title}
          </Heading>
          
          <Text color={textColor} mb={3} noOfLines={2} fontSize="sm">
            {project.description}
          </Text>
          
          <HStack mb={3} spacing={2}>
            <Avatar size="xs" name={project.farmerFormatted} />
            <Text fontSize="sm" color={secondaryTextColor}>
              by {project.farmerFormatted}
            </Text>
          </HStack>
          
          <HStack mb={4} spacing={2}>
            <Icon as={FaMapMarkerAlt} color="brand.500" boxSize={3} />
            <Text fontSize="sm" color={secondaryTextColor}>
              {project.location}
            </Text>
          </HStack>
          
          {/* Funding progress */}
          <Box mb={4}>
            <HStack justify="space-between" mb={2}>
              <Text fontSize="sm" fontWeight="medium">
                Funding Progress
              </Text>
              <Text fontSize="sm" color="brand.500" fontWeight="bold">
                {Math.round(fundingProgress)}%
              </Text>
            </HStack>
            
            <Progress 
              value={fundingProgress} 
              colorScheme="brand" 
              size="sm" 
              borderRadius="full"
              bg={useColorModeValue('gray.200', 'gray.600')}
            />
            
            <HStack justify="space-between" mt={2}>
              <VStack align="start" spacing={0}>
                <Text fontSize="xs" color={secondaryTextColor}>Raised</Text>
                <Text fontSize="sm" fontWeight="bold" color="brand.500">
                  {fundedUSDC.toFixed(2)} USDC
                </Text>
              </VStack>
              
              <VStack align="end" spacing={0}>
                <Text fontSize="xs" color={secondaryTextColor}>Goal</Text>
                <Text fontSize="sm" fontWeight="medium">
                  {targetUSDC.toFixed(2)} USDC
                </Text>
              </VStack>
            </HStack>
          </Box>
          
          {/* Project stats */}
          <HStack justify="space-between" mb={4}>
            <VStack align="start" spacing={0}>
              <Text fontSize="xs" color={secondaryTextColor}>Days Left</Text>
              <HStack spacing={1}>
                <Icon as={FaClock} color="orange.500" boxSize={3} />
                <Text fontSize="sm" fontWeight="bold">
                  {project.daysLeft === 'N/A' ? 'N/A' : `${project.daysLeft} days`}
                </Text>
              </HStack>
            </VStack>
            
            <VStack align="end" spacing={0}>
              <Text fontSize="xs" color={secondaryTextColor}>Investors</Text>
              <HStack spacing={1}>
                <Icon as={FaUser} color="purple.500" boxSize={3} />
                <Text fontSize="sm" fontWeight="bold">
                  {project.investorCount || '0'}
                </Text>
              </HStack>
            </VStack>
          </HStack>
        </CardBody>
        
        {/* Footer button */}
        <CardFooter pt={0}>
          <Button 
            as={RouterLink}
            to={`/projects/${project.id}`}
            colorScheme="brand" 
            width="100%"
            leftIcon={<Icon as={FaEye} boxSize="16px" />}
            borderRadius="lg"
          >
            View Details
          </Button>
        </CardFooter>
      </Card>
    );
  }, (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.project.id === nextProps.project.id &&
      prevProps.project.stableKey === nextProps.project.stableKey &&
      prevProps.project.currentAmountUSDC === nextProps.project.currentAmountUSDC
    );
  });

  // Loading skeleton
  const ProjectSkeleton = React.memo(() => (
    <Card bg={cardBg} overflow="hidden" borderRadius="xl">
      <Skeleton height="200px" />
      <CardBody>
        <SkeletonText mt={4} noOfLines={3} spacing={4} />
        <Skeleton height="20px" mt={4} />
        <Skeleton height="30px" mt={4} />
      </CardBody>
      <CardFooter>
        <Skeleton height="40px" width="100%" />
      </CardFooter>
    </Card>
  ));

  // Manual refresh function
  const handleRefresh = useCallback(() => {
    if (!fetchingRef.current) {
      fetchProjects();
    }
  }, [fetchProjects]);

  if (!isConnected) {
    return (
      <Container maxW="7xl" py={8}>
        <Center py={20}>
          <Alert status="warning" borderRadius="lg" maxW="md">
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Wallet Not Connected</Text>
              <Text fontSize="sm">Please connect your wallet to view projects.</Text>
            </Box>
          </Alert>
        </Center>
      </Container>
    );
  }

  return (
    <Box bg={bgColor} minH="100vh">
      <Container maxW="7xl" py={8}>
        <Stack spacing={8}>
          {/* Header */}
          <Box>
            <Heading as="h1" size="2xl" mb={2} bgGradient="linear(to-r, brand.500, brand.600)" bgClip="text">
              Farming Projects
            </Heading>
            <Text color={secondaryTextColor} fontSize="lg">
              Real projects from the blockchain ({projects.length} total)
            </Text>
          </Box>

          {/* Filters */}
          <Card bg={cardBg} p={6} borderRadius="xl" boxShadow="sm">
            <Stack direction={{ base: 'column', md: 'row' }} spacing={4}>
              <InputGroup maxW={{ base: '100%', md: '300px' }}>
                <InputLeftElement pointerEvents="none">
                  <Icon as={FaSearch} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  borderRadius="lg"
                />
              </InputGroup>
              
              <Select
                placeholder="All Categories"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                maxW={{ base: '100%', md: '200px' }}
                borderRadius="lg"
              >
                <option value="Rice Cultivation">Rice Cultivation</option>
                <option value="Fruit Cultivation">Fruit Cultivation</option>
                <option value="Vegetable Cultivation">Vegetable Cultivation</option>
                <option value="Livestock">Livestock</option>
                <option value="Fisheries">Fisheries</option>
                <option value="Agroforestry">Agroforestry</option>
                <option value="Poultry">Poultry</option>
                <option value="Dairy Farming">Dairy Farming</option>
              </Select>
              
              <Select
                placeholder="All Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                maxW={{ base: '100%', md: '150px' }}
                borderRadius="lg"
              >
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </Select>

              <Button onClick={handleRefresh} isLoading={loading} colorScheme="brand" variant="outline">
                Refresh
              </Button>
            </Stack>
          </Card>

          {/* Projects grid */}
          {error ? (
            <Alert status="error" borderRadius="lg">
              <AlertIcon />
              <Box>
                <Text fontWeight="bold">Error Loading Projects</Text>
                <Text fontSize="sm">{error}</Text>
                <Button 
                  mt={4} 
                  size="sm" 
                  colorScheme="red" 
                  variant="outline"
                  onClick={handleRefresh}
                  isLoading={loading}
                >
                  Try Again
                </Button>
              </Box>
            </Alert>
          ) : loading ? (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {[...Array(6)].map((_, i) => (
                <ProjectSkeleton key={`skeleton-${i}`} />
              ))}
            </SimpleGrid>
          ) : filteredProjects.length === 0 ? (
            <Center py={20}>
              <VStack spacing={4}>
                <Icon as={FaExclamationTriangle} boxSize={12} color="gray.400" />
                <Text fontSize="xl" color="gray.500">
                  {projects.length === 0 ? 'No projects found' : 'No projects match your filters'}
                </Text>
                <Text color="gray.400">
                  {projects.length === 0 
                    ? 'No projects exist on the blockchain yet' 
                    : 'Try adjusting your search or filters'
                  }
                </Text>
                <Button onClick={handleRefresh} variant="outline" colorScheme="brand" isLoading={loading}>
                  Refresh Projects
                </Button>
              </VStack>
            </Center>
          ) : (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
              {filteredProjects.map((project) => (
                <ProjectCard key={project.stableKey} project={project} />
              ))}
            </SimpleGrid>
          )}

          {/* Stats footer */}
          {!loading && !error && projects.length > 0 && (
            <Card bg={cardBg} p={6} borderRadius="xl" boxShadow="sm">
              <HStack justify="space-around" textAlign="center">
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold" color="brand.500">
                    {projects.length}
                  </Text>
                  <Text color={secondaryTextColor}>Total Projects</Text>
                </VStack>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold" color="green.500">
                    {projects.filter(p => p.status === 'Active').length}
                  </Text>
                  <Text color={secondaryTextColor}>Active Projects</Text>
                </VStack>
                <VStack>
                  <Text fontSize="2xl" fontWeight="bold" color="purple.500">
                    {filteredProjects.length}
                  </Text>
                  <Text color={secondaryTextColor}>Filtered Results</Text>
                </VStack>
              </HStack>
            </Card>
          )}
        </Stack>
      </Container>
    </Box>
  );
};

export default Projects;